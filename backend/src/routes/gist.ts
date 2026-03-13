import { Router } from 'express';
import { z } from 'zod';
import PdfPrinter from 'pdfmake';
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
    if (!app.momText) throw new AppError(400, 'MISSING_MOM', 'MoM text required before locking');

    const updated = await prisma.application.update({
      where: { id: req.params.applicationId },
      data: { momLocked: true, momLockedAt: new Date(), status: 'FINALIZED' },
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
  if (!app.momText) throw new AppError(400, 'NO_MOM', 'MoM has not been generated yet');

  const momContent = app.momText || app.gistText || '';
  const projectName = app.projectName;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  if (format === 'pdf') {
    const fonts = {
      Roboto: {
        normal: 'node_modules/pdfmake/build/vfs_fonts.js',
        bold: 'node_modules/pdfmake/build/vfs_fonts.js',
      },
    };

    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [60, 70, 60, 70] as [number, number, number, number],
      content: [
        { text: 'CHHATTISGARH ENVIRONMENT CONSERVATION BOARD', style: 'header', alignment: 'center' },
        { text: 'MINUTES OF MEETING', style: 'subheader', alignment: 'center', margin: [0, 4, 0, 2] },
        { text: `Project: ${projectName}`, style: 'title', margin: [0, 12, 0, 4] },
        { text: `Date: ${today}`, style: 'meta', margin: [0, 0, 0, 20] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 1.5 }], margin: [0, 0, 0, 16] },
        { text: momContent, style: 'body' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5 }], margin: [0, 30, 0, 8] },
        { text: 'Member Secretary, CECB', style: 'signature', alignment: 'right' },
        { text: `Chhattisgarh Environment Conservation Board`, style: 'signatureSub', alignment: 'right' },
      ],
      styles: {
        header: { fontSize: 14, bold: true, color: '#1B5E20' },
        subheader: { fontSize: 12, bold: true, color: '#37474F' },
        title: { fontSize: 12, bold: true },
        meta: { fontSize: 10, color: '#666' },
        body: { fontSize: 10.5, lineHeight: 1.6 },
        signature: { fontSize: 11, bold: true, margin: [0, 4, 0, 0] },
        signatureSub: { fontSize: 9, color: '#555' },
      },
      defaultStyle: { font: 'Roboto' },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition as Parameters<InstanceType<typeof PdfPrinter>['createPdfKitDocument']>[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MoM-${app.id.slice(0, 8)}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
    return;
  }

  if (format === 'docx') {
    // Simple DOCX using docxtemplater with embedded template
    const templatePath = path.join(__dirname, '../templates/mom_template.docx');
    if (!fs.existsSync(templatePath)) {
      // Fallback: send plain text as .txt
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="MoM-${app.id.slice(0, 8)}.txt"`);
      return res.send(momContent);
    }

    const templateContent = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateContent);
    const doc = new Docxtemplater(zip, { linebreaks: true });

    doc.setData({ projectName, date: today, content: momContent });
    doc.render();

    const output = doc.getZip().generate({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="MoM-${app.id.slice(0, 8)}.docx"`);
    return res.send(output);
  }

  throw new AppError(400, 'INVALID_FORMAT', 'Format must be pdf or docx');
}));

export default router;
