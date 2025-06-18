import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

class NotificationService {
  async sendSlackNotification(message: string, details?: any): Promise<void> {
    if (!config.ENABLE_SLACK_NOTIFICATIONS || !config.SLACK_WEBHOOK_URL) {
      logger.debug('Slack notifications disabled or not configured');
      return;
    }

    try {
      await axios.post(config.SLACK_WEBHOOK_URL, {
        text: message,
        attachments: details ? [{
          color: 'danger',
          fields: Object.entries(details).map(([key, value]) => ({
            title: key,
            value: JSON.stringify(value),
            short: true,
          })),
        }] : undefined,
      });
      logger.info('Slack notification sent');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  }

  async sendDiscordNotification(message: string, details?: any): Promise<void> {
    if (!config.ENABLE_DISCORD_NOTIFICATIONS || !config.DISCORD_WEBHOOK_URL) {
      logger.debug('Discord notifications disabled or not configured');
      return;
    }

    try {
      await axios.post(config.DISCORD_WEBHOOK_URL, {
        content: message,
        embeds: details ? [{
          color: 0xff0000,
          fields: Object.entries(details).map(([key, value]) => ({
            name: key,
            value: JSON.stringify(value).substring(0, 1024),
            inline: true,
          })),
        }] : undefined,
      });
      logger.info('Discord notification sent');
    } catch (error) {
      logger.error('Failed to send Discord notification:', error);
    }
  }

  async sendTestFailureAlert(report: any): Promise<void> {
    const message = `🚨 Pulse Smoke Tests Failed!\n` +
      `Failed: ${report.failedTests}/${report.totalTests} tests\n` +
      `Success Rate: ${report.successRate}\n` +
      `Duration: ${report.totalDuration}`;

    const details = {
      timestamp: report.timestamp,
      failures: report.failures.map((f: any) => ({
        test: f.testName,
        error: f.error,
        duration: f.duration + 'ms',
      })),
    };

    await Promise.all([
      this.sendSlackNotification(message, details),
      this.sendDiscordNotification(message, details),
    ]);
  }

  async sendCriticalAlert(message: string, error: any): Promise<void> {
    const alertMessage = `🔥 CRITICAL: ${message}`;
    const details = {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    };

    await Promise.all([
      this.sendSlackNotification(alertMessage, details),
      this.sendDiscordNotification(alertMessage, details),
    ]);
  }
}

export const notificationService = new NotificationService();