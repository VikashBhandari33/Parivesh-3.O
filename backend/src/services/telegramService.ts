import axios from 'axios';
import { logger } from '../utils/logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Sends a notification via Telegram.
 * Note: The recipient must have started a conversation with the bot first.
 * For this implementation, we use a default chat ID if specific user chat ID isn't provided.
 */
export const sendTelegramNotification = async (message: string, chatId?: string): Promise<boolean> => {
    try {
        const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

        if (!BOT_TOKEN) {
            logger.warn('TELEGRAM_BOT_TOKEN not found. Telegram notifications will be logged to console.');
            logger.info(`[MOCK TELEGRAM] To: ${targetChatId || 'No ChatID'} | Msg: ${message}`);
            return true;
        }

        if (!targetChatId) {
            logger.warn('Attempted to send Telegram notification, but no CHAT_ID was provided.');
            return false;
        }

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        await axios.post(url, {
            chat_id: targetChatId,
            text: message,
            parse_mode: 'Markdown'
        });

        logger.info(`[Telegram] Message sent to chat ID: ${targetChatId}`);
        return true;
    } catch (error: any) {
        const errorDetail = error.response?.data?.description || error.message;
        console.error('TELEGRAM_ERROR:', errorDetail);
        logger.error(`Failed to send Telegram message:`, errorDetail);
        return false;
    }
};
