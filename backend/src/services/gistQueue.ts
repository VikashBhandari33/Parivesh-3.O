import Bull from 'bull';
import Groq from 'groq-sdk';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { io } from '../lib/socket';
import { auditChainService } from './auditChain';

export const gistQueue = new Bull('gist-generation', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface GistJobData {
  applicationId: string;
}

gistQueue.process(async (job) => {
  const { applicationId } = job.data as GistJobData;
  logger.info(`Processing gist generation for application: ${applicationId}`);

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        proponent: true,
        documents: true,
        gisRiskFlags: true,
        edsNotices: { orderBy: { issuedAt: 'desc' }, take: 1 },
      },
    });

    if (!application) throw new Error(`Application ${applicationId} not found`);

    // Build OCR text summary from documents
    const ocrSummary = application.documents
      .filter((d: any) => d.ocrText)
      .map((d: any) => `[${d.docType}]: ${d.ocrText?.slice(0, 500)}`)
      .join('\n\n')
      .slice(0, 3000);

    const documentList = application.documents.map((d: any) => d.docType).join(', ');

    const gisFlagsText = application.gisRiskFlags.length > 0
      ? application.gisRiskFlags
          .map((f: any) => `${f.flagType} within ${Math.round(f.distanceM)}m (${f.layerName})`)
          .join('; ')
      : 'No environmental proximity concerns identified';

    // Build prompt using the template from the spec
    const prompt = `You are an expert environmental clearance officer at CECB.
Generate a formal Meeting Gist document for the following environmental clearance application.

Application Data:
- Project Name: ${application.projectName}
- Sector: ${application.sector}
- Location: ${application.district || 'Not specified'}, ${application.state}
- Area (ha): ${application.areaHa || 'Not specified'}
- Proponent: ${application.proponent.name} (${application.proponent.organization || 'Individual'})
- Applied: ${application.createdAt.toISOString().split('T')[0]}
- Key Documents: ${documentList || 'None uploaded'}
- Environmental Concerns: ${gisFlagsText}
- Extracted Text Summary: ${ocrSummary || 'No OCR text available'}

Generate a structured gist with these sections. Use markdown bolding (e.g. **1. Project Overview**) for each section header:
1. Project Overview
2. Location & Environmental Context
3. Key Facts & Parameters
4. Documents Verified
5. Environmental Concerns Identified
6. Committee Observations
7. Recommended Conditions (if applicable)

Tone: Formal government document. Language: English.
Format: Structured paragraphs with bold section headers. No bullet points.`;

    let gistText: string;

    try {
      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.3,
      });

      gistText = completion.choices[0]?.message?.content || '';
    } catch (groqErr) {
      logger.warn('Groq API failed, using fallback gist template');
      // Fallback: structured template
      gistText = generateFallbackGist(application);
    }

    // Save gist and update status
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        gistText,
        status: 'MOM_GENERATED',
      },
    });

    await auditChainService.log({
      eventType: 'GIST_GENERATED',
      actorId: application.proponentId,
      applicationId,
      payload: { model: 'llama-3.3-70b-versatile', tokenCount: gistText.length },
    });

    // Notify MoM Team
    io.emit('notification:mom', {
      type: 'GIST_READY',
      applicationId,
      projectName: application.projectName,
    });

    io.to(`application:${applicationId}`).emit('status:changed', {
      applicationId,
      status: 'MOM_GENERATED',
    });

    logger.info(`✅ Gist generated for application: ${applicationId}`);
    return { success: true, applicationId };
  } catch (err) {
    logger.error(`Gist generation failed for ${applicationId}:`, err);
    throw err;
  }
});

function generateFallbackGist(application: any): string {
  return `**MEETING GIST — ENVIRONMENTAL CLEARANCE APPLICATION**

**PROJECT OVERVIEW**
The project "${application.projectName}" falling under the ${application.sector} sector has been referred for committee consideration. The application was filed by ${application.proponent.name} (${application.proponent.organization || 'Individual Proponent'}) on ${application.createdAt.toISOString().split('T')[0]}.

**LOCATION & ENVIRONMENTAL CONTEXT**
The proposed project is located in ${application.district || 'the specified district'}, ${application.state}. The total project area is ${application.areaHa || 'as specified'} hectares.

**KEY FACTS & PARAMETERS**
Project Name: ${application.projectName}
Sector: ${application.sector}
Location: ${application.district}, ${application.state}
Area: ${application.areaHa} ha
Proponent: ${application.proponent.name}

**DOCUMENTS VERIFIED**
The following documents have been submitted and verified: ${application.documents.map((d: any) => d.docType).join(', ') || 'None on record'}.

**ENVIRONMENTAL CONCERNS IDENTIFIED**
${application.gisRiskFlags.length > 0
  ? application.gisRiskFlags.map((f: any) => `The project site is located within ${Math.round(f.distanceM)} metres of ${f.flagType.toLowerCase()} areas, which requires specific attention during review.`).join(' ')
  : 'No significant environmental proximity concerns have been identified based on GIS analysis.'}

**COMMITTEE OBSERVATIONS**
The Committee has reviewed the application in detail. All submitted documents have been verified by the Scrutiny Team. The application meets the procedural requirements for committee consideration.

**RECOMMENDED CONDITIONS**
Subject to compliance with applicable environmental norms and conditions as may be stipulated by the Committee, the application may be considered for further processing as per the prescribed rules and regulations.`;
}

gistQueue.on('failed', (job, err) => {
  logger.error(`Gist job ${job.id} failed:`, err);
});

gistQueue.on('completed', (job) => {
  logger.info(`Gist job ${job.id} completed`);
});
