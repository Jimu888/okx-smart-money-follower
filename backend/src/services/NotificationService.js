const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

class NotificationService {
  async send(payload) {
    // MVP: just log. Later: telegram/discord/email.
    logger.info(`[notify] ${payload?.title || ''} ${payload?.message || ''}`);
  }
}

module.exports = NotificationService;