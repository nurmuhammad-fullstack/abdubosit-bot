const { t }             = require('../../utils/i18n');
const { contactKeyboard } = require('../keyboards');
const logger            = require('../../utils/logger');

async function contactHandler(ctx) {
  try {
    const lang = ctx.dbUser?.language || 'en';
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      t(lang, 'contact.text'),
      { parse_mode: 'Markdown', ...contactKeyboard(t, lang) }
    );
  } catch (err) {
    logger.error('contactHandler error:', err);
  }
}

module.exports = { contactHandler };
