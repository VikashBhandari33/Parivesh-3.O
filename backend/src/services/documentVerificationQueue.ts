import Bull from 'bull';
import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
// @ts-ignore
import pdfParse from 'pdf-parse';
// @ts-ignore
import Tesseract from 'tesseract.js';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { io } from '../lib/socket';

export const documentVerificationQueue = new Bull('document-verification', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface DocVerifyJobData {
  documentId: string;
}

documentVerificationQueue.process(async (job) => {
  const { documentId } = job.data as DocVerifyJobData;
  logger.info(`Starting Intelligent Document Verification for DOC: ${documentId}`);

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { application: true },
    });

    if (!document) throw new Error(`Document ${documentId} not found`);

    // 1. OCR Stage
    let extractedText = '';
    const filePath = document.fileUrl.startsWith('/uploads')
      ? path.join(process.cwd(), document.fileUrl)
      : document.fileUrl; // Handle local fallback or absolute path if not S3

    if (fs.existsSync(filePath)) {
      if (document.mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        extractedText = await pdfParse(dataBuffer).then((data: any) => data.text);
      } else if (document.mimeType.startsWith('image/')) {
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
        extractedText = text;
      } else {
        extractedText = `(No OCR support for mime type: ${document.mimeType})`;
      }
    } else {
        extractedText = "(File could not be found for OCR)";
    }

    // Limit text length for LLM (approx 4k tokens ~ 16k chars)
    const truncatedText = extractedText.slice(0, 16000);

    // 2. Classification & NLP Completeness Stage (Groq)
    const prompt = `You are an AI Document Scrutiny Assistant for the Environmental Clearance system.
Analyze the following raw OCR text extracted from an uploaded document.
Document Type claimed by user: ${document.docType}

Extract and analyze the following:
1. "classification": Determine the actual document type based on the content (e.g. "EIA Report", "NOC", "Site Plan", "Unknown").
2. "status": Determine completeness. Return "Complete", "Incomplete", or "Review".
   - "Complete": Document looks valid and contains sufficient context for its claimed type.
   - "Incomplete": Important sections (like signatures, seals, or main body text) seem to be missing.
   - "Review": Low confidence, text is garbled, or it doesn't match the claimed document type.
3. "findings": An array of specific strings noting what is good or missing (e.g., "Missing official signature", "Includes all 4 main sections", "Poor scan quality"). Limit to 2-3 brief bullet points.
4. "pages": Estimate the number of pages or sections if possible, else return null.
5. "confidence": A percentage (0-100) of how confident you are in your assessment.

Respond ONLY with valid JSON matching this schema:
{
  "classification": string,
  "status": "Complete" | "Incomplete" | "Review",
  "findings": string[],
  "pages": number | null,
  "confidence": number
}

Raw OCR Text snippet:
---
${truncatedText || "(No readable text)"}
---`;

    let verificationResult = null;
    
    // Default fallback in case Groq fails
    const defaultFallback = {
        classification: document.docType,
        status: "Review",
        findings: ["Failed to run AI analysis", "Review manually"],
        pages: null,
        confidence: 0
    };

    try {
      if (process.env.GROQ_API_KEY) {
          const completion = await groqClient.chat.completions.create({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 1024,
            temperature: 0.1,
          });

          const responseText = completion.choices[0]?.message?.content || '{}';
          verificationResult = JSON.parse(responseText);
      } else {
          logger.warn('GROQ_API_KEY not found. Skipping NLP completeness check.');
          verificationResult = { ...defaultFallback, findings: ["GROQ_API_KEY missing. OCR completed."] };
      }
    } catch (llmErr) {
      logger.error('Failed to run Groq document analysis', llmErr);
      verificationResult = defaultFallback;
    }

    // 3. Save Results
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrText: extractedText.trim() ? extractedText : null,
        verificationResult: verificationResult,
      },
    });

    // 4. Notify Frontend
    io.to(`application:${document.applicationId}`).emit('document:verified', {
      documentId: updatedDoc.id,
      applicationId: updatedDoc.applicationId,
      status: verificationResult?.status || 'Review',
    });

    logger.info(`✅ OCR & Verification complete for DOC: ${documentId} (${verificationResult?.status})`);
    return { success: true, documentId };

  } catch (error) {
    logger.error(`Document verification failed for ${documentId}:`, error);
    throw error;
  }
});

documentVerificationQueue.on('failed', (job, err) => {
  logger.error(`Document validation job ${job.id} failed:`, err);
});
