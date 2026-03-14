import twilio from 'twilio';
import { logger } from '../utils/logger';

let twilioClient: twilio.Twilio | null = null;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
    logger.warn('Twilio credentials not found. SMS messages will be logged to console instead of sent via API.');
}

/**
 * Sends an SMS message to a phone number.
 * If Twilio is not configured, safely logs the simulated output.
 */
export const sendSMS = async (to: string, message: string): Promise<boolean> => {
    try {
        if (!to) {
            logger.warn('Attempted to send SMS, but no destination phone number was provided.');
            return false;
        }

        if (twilioClient && fromPhone) {
            const sms = await twilioClient.messages.create({
                body: message,
                from: fromPhone,
                to: to
            });
            logger.info(`[Twilio APIs] SMS sent to ${to}. SID: ${sms.sid}`);
            return true;
        } else {
            // Safe fallback logic for local development
            logger.info(`\n=========== [MOCK SMS ALERT] ===========\nTo: ${to}\nMessage: ${message}\n========================================\n`);
            return true;
        }
    } catch (error) {
        logger.error(`Failed to send SMS to ${to}:`, error);
        return false;
    }
};
