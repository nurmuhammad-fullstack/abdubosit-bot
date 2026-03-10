const { t }              = require('../../utils/i18n');
const { servicesKeyboard, mainMenuButton } = require('../keyboards');
const logger             = require('../../utils/logger');

const SERVICE_KEYS = ['logo', 'smm', 'web', 'poster'];

/**
 * Show services list
 */
async function servicesHandler(ctx) {
  try {
    const lang = ctx.dbUser?.language || 'en';
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      t(lang, 'services.title'),
      { parse_mode: 'Markdown', ...servicesKeyboard(t, lang) }
    );
  } catch (err) {
    logger.error('servicesHandler error:', err);
  }
}

/**
 * Show individual service detail
 * callback data: service:logo | service:smm | service:web | service:poster
 */
async function serviceDetailHandler(ctx) {
  try {
    const lang       = ctx.dbUser?.language || 'en';
    const serviceKey = ctx.callbackQuery.data.split(':')[1]; // 'logo' etc.

    if (!SERVICE_KEYS.includes(serviceKey)) return ctx.answerCbQuery();

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      t(lang, `services.${serviceKey}.text`),
      { parse_mode: 'Markdown', ...servicesKeyboard(t, lang) }
    );
  } catch (err) {
    logger.error('serviceDetailHandler error:', err);
  }
}

module.exports = { servicesHandler, serviceDetailHandler };
