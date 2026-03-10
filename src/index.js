require('dotenv').config();

const logger = require('./utils/logger');
const bot    = require('./bot');

const NODE_ENV = process.env.NODE_ENV || 'development';

async function bootstrap() {
  logger.info('🚀 Starting Portfolio Bot...');

  if (!process.env.BOT_TOKEN) {
    logger.error('BOT_TOKEN is not set in .env');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    logger.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  if (NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    // ── Webhook mode (production) ──
    const { createServer } = require('http');
    const PORT = process.env.PORT || 3000;
    const WEBHOOK_PATH = `/bot${process.env.BOT_TOKEN}`;

    await bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}${WEBHOOK_PATH}`);

    const server = createServer(bot.webhookCallback(WEBHOOK_PATH));
    server.listen(PORT, () => {
      logger.info(`✅ Bot running in webhook mode on port ${PORT}`);
    });
  } else {
    // ── Long polling mode (development) ──
    await bot.telegram.deleteWebhook();
    await bot.launch();
    logger.info('✅ Bot running in polling mode');
  }

  // Graceful shutdown
  process.once('SIGINT',  () => { logger.info('Shutting down...'); bot.stop('SIGINT');  });
  process.once('SIGTERM', () => { logger.info('Shutting down...'); bot.stop('SIGTERM'); });
}

bootstrap().catch(err => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
