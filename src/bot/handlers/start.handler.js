const { t }               = require('../../utils/i18n');
const { languageKeyboard, mainMenuKeyboard } = require('../keyboards');
const userRepo            = require('../../repositories/user.repository');
const logger              = require('../../utils/logger');

/**
 * /start — greet user by name and show language selection
 */
async function startHandler(ctx) {
  try {
    const firstName = ctx.from.first_name || 'Friend';
    await ctx.reply(`👋 Hello ${firstName}!`, 
      languageKeyboard()
    );
  } catch (err) {
    logger.error('startHandler error:', err);
  }
}

/**
 * Handle language selection callback: lang:uz | lang:ru | lang:en
 */
async function languageCallbackHandler(ctx) {
  try {
    const lang = ctx.callbackQuery.data.split(':')[1]; // 'uz' | 'ru' | 'en'

    await userRepo.setLanguage(ctx.from.id, lang);
    ctx.dbUser = { ...ctx.dbUser, language: lang };

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      t(lang, 'language_selected') + '\n\n' + t(lang, 'main_menu.title'),
      { parse_mode: 'Markdown', ...mainMenuKeyboard(t, lang) }
    );
  } catch (err) {
    logger.error('languageCallbackHandler error:', err);
    await ctx.answerCbQuery('Error, please try again');
  }
}

module.exports = { startHandler, languageCallbackHandler };

