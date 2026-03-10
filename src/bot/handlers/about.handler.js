const { t }           = require('../../utils/i18n');
const { mainMenuButton } = require('../keyboards');
const logger          = require('../../utils/logger');

async function aboutHandler(ctx) {
  try {
    const lang = ctx.dbUser?.language || 'en';
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      t(lang, 'about.text'),
      { parse_mode: 'Markdown', ...mainMenuButton(t, lang) }
    );
  } catch (err) {
    logger.error('aboutHandler error:', err);
  }
}

module.exports = { aboutHandler };
