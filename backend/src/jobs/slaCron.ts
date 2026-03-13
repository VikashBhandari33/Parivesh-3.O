import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { auditLog } from '../services/auditChain';
// import cron from 'node-cron';

/**
 * STUB: SLA Escalation Cron Job
 * 
 * In a real environment, use node-cron:
 * cron.schedule('0 0 * * *', async () => { ... });
 * 
 * Logic:
 * Checks for applications sitting in 'SUBMITTED' or 'UNDER_SCRUTINY' 
 * for more than 30 days and automatically raises a flag or escalates.
 */

export const checkSLAEscalations = async () => {
  logger.info('Running SLA Escalation Check Job...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdueApplications = await prisma.application.findMany({
      where: {
        status: { in: ['SUBMITTED', 'UNDER_SCRUTINY'] },
        updatedAt: { lt: thirtyDaysAgo }
      }
    });

    if (overdueApplications.length > 0) {
      logger.warn(`Found ${overdueApplications.length} overdue applications. Triggering escalations.`);
      
      for (const app of overdueApplications) {
        // e.g. Notify senior officers, update internal escalation flag, etc.
        // Creating an audit log entry for the system action
        await auditLog('SYSTEM_ESCALATION', 'SYSTEM', {
          applicationId: app.id,
          message: 'SLA threshold (30 days) exceeded in current status',
          previousStatus: app.status
        });
      }
    } else {
      logger.info('No overdue applications found.');
    }
  } catch (error) {
    logger.error('Error in checkSLAEscalations cron job:', error);
  }
};
