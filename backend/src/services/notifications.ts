import { logger } from '../utils/logger';

/**
 * STUB: Twilio / SendGrid Notifications Integration
 * 
 * Replace these console logs with actual SDK calls:
 * e.g., const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
 */

export const sendSms = async (phone: string, message: string) => {
  logger.info(`[Twilio Stub] SMS to ${phone}: ${message}`);
  // twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phone });
};

export const sendWhatsApp = async (phone: string, message: string) => {
  logger.info(`[Twilio Stub] WhatsApp to ${phone}: ${message}`);
  // twilioClient.messages.create({ body: message, from: `whatsapp:${process.env.TWILIO_WA_SENDER}`, to: `whatsapp:${phone}` });
};

export const sendEmail = async (email: string, subject: string, htmlContent: string) => {
  logger.info(`[SendGrid Stub] Email to ${email} | Subject: ${subject}`);
  // sgMail.send({ to: email, from: 'noreply@cecb.cg.gov.in', subject, html: htmlContent });
};
