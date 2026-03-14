import { Router } from 'express';
import { z } from 'zod';
const PdfPrinter = require('pdfmake');
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';

const router = Router();

// ─── GET /api/gist/:applicationId ────────────────────────────────────────────
router.get('/:applicationId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({
    where: { id: req.params.applicationId },
    select: { id: true, gistText: true, momText: true, momLocked: true, status: true, projectName: true },
  });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  res.json({ success: true, data: app });
}));

// ─── PATCH /api/gist/:applicationId — MoM Team edits gist ────────────────────
router.patch('/:applicationId', authenticate, requireRole(['MOM_TEAM', 'ADMIN']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { momText } = z.object({ momText: z.string().min(10) }).parse(req.body);

    const app = await prisma.application.findUnique({ where: { id: req.params.applicationId } });
    if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (app.momLocked) throw new AppError(400, 'MOM_LOCKED', 'MoM is finalized and cannot be edited');

    const updated = await prisma.application.update({
      where: { id: req.params.applicationId },
      data: { momText },
    });

    await auditChainService.log({
      eventType: 'MOM_EDITED',
      actorId: req.user!.id,
      applicationId: app.id,
      payload: { charCount: momText.length },
    });

    res.json({ success: true, data: { momText: updated.momText } });
  })
);

// ─── POST /api/gist/:applicationId/lock ──────────────────────────────────────
router.post('/:applicationId/lock', authenticate, requireRole(['MOM_TEAM', 'ADMIN']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const app = await prisma.application.findUnique({ where: { id: req.params.applicationId } });
    if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (app.momLocked) throw new AppError(400, 'ALREADY_LOCKED', 'MoM already locked');
    if (!app.momText && !app.gistText) throw new AppError(400, 'MISSING_MOM', 'MoM text required before locking');

    // Automatically copy the gist text into momText if locking an untouched gist
    const finalMomText = app.momText || app.gistText;

    const updated = await prisma.application.update({
      where: { id: req.params.applicationId },
      data: { momLocked: true, momLockedAt: new Date(), status: 'FINALIZED', momText: finalMomText },
    });

    await auditChainService.log({
      eventType: 'MOM_LOCKED',
      actorId: req.user!.id,
      applicationId: app.id,
      payload: {},
    });

    res.json({ success: true, data: updated });
  })
);

// ─── GET /api/gist/:applicationId/export?format=pdf|docx ─────────────────────
router.get('/:applicationId/export', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const format = (req.query.format as string) || 'pdf';
  const app = await prisma.application.findUnique({
    where: { id: req.params.applicationId },
    include: { proponent: { select: { name: true, organization: true, email: true } } },
  });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  if (!app.momText && !app.gistText) throw new AppError(400, 'NO_MOM', 'MoM has not been generated yet');

  // Aggressive HTML stripping but preserving bolding
  const cleanContent = (html: string) => {
    if (!html) return '';
    return html
      .replace(/<p[^>]*>/g, '') 
      .replace(/<\/p>/g, '\n')
      .replace(/<div[^>]*>/g, '')
      .replace(/<\/div>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<[^>]*>/g, '') // strip any left labels
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  };

  const momContent = cleanContent(app.momText || app.gistText || '');
  const projectName = app.projectName;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // Read logos
  const logo1Path = path.join(__dirname, '../../../frontend/public/emblem-logo.png'); // Left
  const logo2Path = path.join(__dirname, '../../../frontend/public/cecb.png'); // Right

  let logo1Base64 = '';
  let logo2Base64 = '';
  try {
    if (fs.existsSync(logo1Path)) logo1Base64 = `data:image/png;base64,${fs.readFileSync(logo1Path).toString('base64')}`;
    if (fs.existsSync(logo2Path)) logo2Base64 = `data:image/png;base64,${fs.readFileSync(logo2Path).toString('base64')}`;
  } catch (e) { console.error('Logo load failed', e); }

  if (format === 'pdf') {
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);

    const contentNodes = momContent.split('\n').map(line => {
      const boldMatch = line.match(/^\s*\*\*(.*)\*\*\s*$/) || line.match(/^\s*[0-9]\.\s+\*\*(.*)\*\*\s*$/);
      if (boldMatch) {
        return { text: boldMatch[1] || boldMatch[0], bold: true, margin: [0, 10, 0, 4], fontSize: 11 };
      }
      return { text: line, margin: [0, 0, 0, 8], fontSize: 10.5 };
    });

    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [60, 40, 60, 60] as [number, number, number, number],
      content: [
        {
          table: {
            widths: [60, '*', 60],
            body: [
              [
                logo1Base64 ? { image: logo1Base64, width: 45, alignment: 'left' } : {},
                {
                  stack: [
                    { text: 'CHHATTISGARH ENVIRONMENT CONSERVATION BOARD', style: 'header', alignment: 'center' },
                    { text: 'Paryavas Bhawan, North Block, Sector-19, Atal Nagar, Raipur (C.G.)', style: 'preamble', alignment: 'center' },
                    { text: 'MINUTES OF MEETING', style: 'subheader', alignment: 'center', margin: [0, 8, 0, 0] },
                  ]
                },
                logo2Base64 ? { image: logo2Base64, width: 45, alignment: 'right' } : {},
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 10]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 1.5 }], margin: [0, 0, 0, 16] },
        { text: `Project: ${projectName}`, style: 'title', margin: [0, 0, 0, 4] },
        { text: `Date: ${today}`, style: 'meta', margin: [0, 0, 0, 20] },
        ...contentNodes,
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5 }], margin: [0, 30, 0, 8] },
        { text: 'Member Secretary, CECB', style: 'signature', alignment: 'right' },
        { text: `Chhattisgarh Environment Conservation Board`, style: 'signatureSub', alignment: 'right' },
      ],
      styles: {
        header: { fontSize: 13, bold: true, color: '#1B5E20' },
        preamble: { fontSize: 8, color: '#444' },
        subheader: { fontSize: 11, bold: true, color: '#37474F' },
        title: { fontSize: 12, bold: true },
        meta: { fontSize: 10, color: '#666' },
        body: { fontSize: 10.5, lineHeight: 1.6 },
        signature: { fontSize: 11, bold: true, margin: [0, 4, 0, 0] },
        signatureSub: { fontSize: 9, color: '#555' },
      },
      defaultStyle: { font: 'Helvetica' },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition as any);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MoM-${app.id.slice(0, 8)}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
    return;
  }

  if (format === 'docx') {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType } = require('docx');

    const bodyParagraphs = momContent.split('\n').map((line: string) => {
      const boldMatch = line.match(/^\s*\*\*(.*)\*\*\s*$/) || line.match(/^\s*[0-9]\.\s+\*\*(.*)\*\*\s*$/);
      if (boldMatch) {
        return new Paragraph({
          children: [new TextRun({ text: boldMatch[1] || boldMatch[0], bold: true, size: 23 })],
          spacing: { before: 200, after: 100 }
        });
      }
      return new Paragraph({
        children: [new TextRun({ text: line, size: 21 })],
        spacing: { after: 120 }
      });
    });

    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [
            fs.existsSync(logo1Path)
              ? new Paragraph({ children: [new ImageRun({ data: fs.readFileSync(logo1Path), transformation: { width: 45, height: 45 } })], alignment: AlignmentType.LEFT })
              : new Paragraph({ text: "" })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: { top: { style: 'none' as any, size: 0 }, bottom: { style: 'none' as any, size: 0 }, left: { style: 'none' as any, size: 0 }, right: { style: 'none' as any, size: 0 } }
        }),
        new TableCell({
          children: [
            new Paragraph({ text: "CHHATTISGARH ENVIRONMENT CONSERVATION BOARD", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "Paryavas Bhawan, North Block, Sector-19, Atal Nagar, Raipur (C.G.)", alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "MINUTES OF MEETING", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { before: 100 } })
          ],
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: { top: { style: 'none' as any, size: 0 }, bottom: { style: 'none' as any, size: 0 }, left: { style: 'none' as any, size: 0 }, right: { style: 'none' as any, size: 0 } }
        }),
        new TableCell({
          children: [
            fs.existsSync(logo2Path)
              ? new Paragraph({ children: [new ImageRun({ data: fs.readFileSync(logo2Path), transformation: { width: 45, height: 45 } })], alignment: AlignmentType.RIGHT })
              : new Paragraph({ text: "" })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: { top: { style: 'none' as any, size: 0 }, bottom: { style: 'none' as any, size: 0 }, left: { style: 'none' as any, size: 0 }, right: { style: 'none' as any, size: 0 } }
        })
      ]
    });

    const docChildren = [
      new Table({
        rows: [headerRow],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: { style: 'none' as any, size: 0 }, bottom: { style: 'none' as any, size: 0 }, left: { style: 'none' as any, size: 0 }, right: { style: 'none' as any, size: 0 } }
      }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [new TextRun({ text: "Project: ", bold: true }), new TextRun(projectName)] }),
      new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(today)] }),
      new Paragraph({ text: "" }),
      new Paragraph({ text: "--------------------------------------------------------------------------------", alignment: AlignmentType.CENTER }),
      new Paragraph({ text: "" }),
      ...bodyParagraphs,
      new Paragraph({ text: "" }),
      new Paragraph({ text: "--------------------------------------------------------------------------------", alignment: AlignmentType.CENTER }),
      new Paragraph({ text: "" }),
      new Paragraph({ text: "Member Secretary, CECB", alignment: AlignmentType.RIGHT }),
      new Paragraph({ text: "Chhattisgarh Environment Conservation Board", alignment: AlignmentType.RIGHT }),
    ];

    const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="MoM-${app.id.slice(0, 8)}.docx"`);
    return res.send(buffer);
  }

  throw new AppError(400, 'INVALID_FORMAT', 'Format must be pdf or docx');
}));

export default router;
