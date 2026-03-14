import Groq from 'groq-sdk';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface AiAuditResult {
  classified_type: string;
  type_match: boolean;
  confidence: number;
  completeness_score: number;
  status: "COMPLETE" | "INCOMPLETE" | "WRONG_DOCUMENT";
  missing_fields: string[];
  deficiencies: string[];
  ai_summary: string;
}

export class AiAuditService {
  /**
   * Performs an AI audit on a document's OCR text using the specified prompt template.
   */
  async auditDocument(documentId: string): Promise<AiAuditResult | null> {
    logger.info(`Starting AI Audit for document: ${documentId}`);

    try {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          application: {
            include: {
              proponent: true
            }
          }
        }
      });

      if (!doc || !doc.ocrText) {
        logger.warn(`Document ${documentId} not found or has no OCR text.`);
        return null;
      }

      const { application } = doc;
      const proponent = application.proponent;

      const prompt = `You are an expert environmental clearance document reviewer for CECB (Chhattisgarh Environment Conservation Board).

Analyze the OCR-extracted text and return ONLY a valid JSON object. No explanation, no markdown, no preamble.

Required JSON format:
{
  "classified_type": string,
  "type_match": boolean,
  "confidence": number,
  "completeness_score": number,
  "status": "COMPLETE" | "INCOMPLETE" | "WRONG_DOCUMENT",
  "missing_fields": string[],
  "deficiencies": string[],
  "ai_summary": string
}

Document type checklists:
- EIA Report: project name, proponent, location, area in hectares, baseline data, impact assessment, mitigation measures, consultant signature, date
- NOC: issuing authority, project name, date of issue, authorized signatory, validity period
- Site Plan: site boundary, scale/dimensions, location reference, north direction, prepared by
- Project Report: project name, sector, estimated cost/capacity, location, date, signatory
- Land Document: survey/khasra number, area, owner name, district, village, date
- Fee Receipt: receipt number, amount in INR, date, paying party, issuing authority
- Other: document title, date, issuing authority or signatory

Rules:
- If declared type and classified type do not match → type_match: false, status: WRONG_DOCUMENT
- completeness_score: percentage of required fields found (0-100)
- If completeness_score < 70 → status: INCOMPLETE
- If completeness_score >= 70 and type_match: true → status: COMPLETE
- deficiencies: specific problems written as actionable notes for the scrutiny officer
- ai_summary: 1-2 sentences max, plain English, start with the verdict

---

Declared document type: ${doc.docType}

Application context:
- Project: ${application.projectName}
- Sector: ${application.sector}
- District: ${application.district || 'N/A'}
- Proponent: ${proponent.name} (${proponent.organization || 'Individual'})

OCR text:
---
${doc.ocrText}
---`;

      const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(responseText) as AiAuditResult;

      logger.info(`AI Audit completed for document: ${documentId}. Status: ${result.status}`);
      return result;

    } catch (error) {
      logger.error(`AI Audit failed for document ${documentId}:`, error);
      return null;
    }
  }
}

export const aiAuditService = new AiAuditService();
