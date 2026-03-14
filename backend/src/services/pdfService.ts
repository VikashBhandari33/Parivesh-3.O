import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

interface Deficiency {
  field: string;
  reason: string;
}

export const generateEdsPdf = async (
  applicationId: string,
  projectName: string,
  proponentName: string,
  deficiencies: Deficiency[],
  remarks: string | null = null
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `eds_${applicationId}_${Date.now()}.pdf`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'eds');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      const relativeUrl = `/uploads/eds/${fileName}`;

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('Environmental Clearance', { align: 'center', underline: true });
      doc.moveDown(0.5);
      doc.fontSize(16).text('Essential Details Sought (EDS) Notice', { align: 'center' });
      doc.moveDown(2);

      // Application Info
      doc.fontSize(12).font('Helvetica-Bold').text(`Date: `, { continued: true }).font('Helvetica').text(new Date().toLocaleDateString());
      doc.font('Helvetica-Bold').text(`Application ID: `, { continued: true }).font('Helvetica').text(applicationId);
      doc.font('Helvetica-Bold').text(`Project Name: `, { continued: true }).font('Helvetica').text(projectName);
      doc.font('Helvetica-Bold').text(`Proponent: `, { continued: true }).font('Helvetica').text(proponentName);
      doc.moveDown(2);

      // Body text
      doc.text('Upon scrutiny of the above-mentioned application, the following deficiencies or missing documents have been identified. Please address these points and resubmit your application as soon as possible.');
      doc.moveDown(1.5);

      // Deficiencies List
      doc.font('Helvetica-Bold').text('Deficiencies:');
      doc.moveDown(0.5);

      deficiencies.forEach((def, idx) => {
        doc.font('Helvetica-Bold').text(`${idx + 1}. ${def.field}`);
        doc.font('Helvetica').text(`   Reason: ${def.reason}`);
        doc.moveDown(0.5);
      });

      // Remarks
      if (remarks) {
        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Additional Remarks:');
        doc.moveDown(0.5);
        doc.font('Helvetica').text(remarks);
      }

      // Footer
      doc.moveDown(3);
      doc.fillColor('gray').text('This is a system-generated notice and does not require a physical signature.', {
        align: 'center'
      });

      doc.end();

      stream.on('finish', () => {
        logger.info(`Generated EDS PDF for application ${applicationId} at ${relativeUrl}`);
        resolve(relativeUrl);
      });

      stream.on('error', (err) => {
        logger.error(`Error saving EDS PDF to disk:`, err);
        reject(err);
      });

    } catch (error) {
      logger.error('Failed to generate EDS PDF:', error);
      reject(error);
    }
  });
};
