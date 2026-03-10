const { t }             = require('../../utils/i18n');
const userRepo          = require('../../repositories/user.repository');
const leadRepo          = require('../../repositories/lead.repository');
const { cancelKeyboard, removeKeyboard, mainMenuKeyboard } = require('../keyboards');
const logger            = require('../../utils/logger');

/* ── FSM states ── */
const STATE = {
  ASK_NAME:    'ASK_NAME',
  ASK_DESIGN:  'ASK_DESIGN',
  ASK_CONTACT: 'ASK_CONTACT',
};

/* ── Simple contact validator ── */
function isValidContact(text) {
  const usernameRe = /^@[\w]{3,}$/;
  const phoneRe    = /^\+?[\d\s\-()]{7,15}$/;
  return usernameRe.test(text.trim()) || phoneRe.test(text.trim());
}

/* ── Notify admin via Telegram ── */
async function notifyAdmin(bot, lead, lang) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;

  const time = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
  const msg  = t('uz', 'admin_lead', {
    name:    lead.name,
    design:  lead.design_request,
    contact: lead.contact,
    time,
  });

  try {
    await bot.telegram.sendMessage(adminId, msg, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error('Failed to notify admin:', err.message);
  }
}

/**
 * Start lead form — triggered by callback 'lead:start'
 */
async function leadStartHandler(ctx) {
  try {
    const lang = ctx.dbUser?.language || 'en';
    await userRepo.setFsmState(ctx.from.id, STATE.ASK_NAME, {});
    await ctx.answerCbQuery();
    await ctx.reply(t(lang, 'lead.start'), { parse_mode: 'Markdown' });
    await ctx.reply(t(lang, 'lead.ask_name'), cancelKeyboard(t, lang));
  } catch (err) {
    logger.error('leadStartHandler error:', err);
  }
}

/**
 * Handle text messages during FSM flow.
 * Called from the main message handler when user.fsm_state is set.
 */
async function handleFsmMessage(ctx, bot) {
  const user = ctx.dbUser;
  const lang = user.language || 'en';
  const text = ctx.message?.text?.trim();

  // Check for cancel
  if (text === t(lang, 'buttons.cancel') || text === '/cancel') {
    await userRepo.clearFsm(ctx.from.id);
    await ctx.reply(t(lang, 'lead.cancelled'), removeKeyboard());
    await ctx.reply(t(lang, 'main_menu.title'), {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(t, lang),
    });
    return;
  }

  switch (user.fsm_state) {

    case STATE.ASK_NAME: {
      if (!text || text.length < 2) {
        return ctx.reply('⚠️ ' + (lang === 'uz' ? 'Iltimos, ismingizni kiriting.' : lang === 'ru' ? 'Пожалуйста, введите ваше имя.' : 'Please enter your name.'));
      }
      await userRepo.setFsmState(ctx.from.id, STATE.ASK_DESIGN, { name: text });
      await ctx.reply(t(lang, 'lead.ask_design'), { parse_mode: 'Markdown', ...cancelKeyboard(t, lang) });
      break;
    }

    case STATE.ASK_DESIGN: {
      if (!text || text.length < 3) {
        return ctx.reply('⚠️ ' + (lang === 'uz' ? 'Iltimos, kerakli dizaynni yozing.' : lang === 'ru' ? 'Пожалуйста, опишите нужный дизайн.' : 'Please describe the design you need.'));
      }
      const newData = { ...user.fsm_data, design: text };
      await userRepo.setFsmState(ctx.from.id, STATE.ASK_CONTACT, newData);
      await ctx.reply(t(lang, 'lead.ask_contact'), { parse_mode: 'Markdown', ...cancelKeyboard(t, lang) });
      break;
    }

    case STATE.ASK_CONTACT: {
      if (!isValidContact(text)) {
        return ctx.reply(t(lang, 'lead.invalid_contact'));
      }

      // Save lead
      const lead = await leadRepo.create({
        user_id:        user.id,
        name:           user.fsm_data.name,
        design_request: user.fsm_data.design,
        contact:        text,
      });

      // Reset FSM
      await userRepo.clearFsm(ctx.from.id);

      // Thank the user
      await ctx.reply(
        t(lang, 'lead.success', { name: user.fsm_data.name }),
        { parse_mode: 'Markdown', ...removeKeyboard() }
      );

      // Back to main menu
      await ctx.reply(t(lang, 'main_menu.title'), {
        parse_mode: 'Markdown',
        ...mainMenuKeyboard(t, lang),
      });

      // Notify admin
      await notifyAdmin(bot, lead, lang);
      break;
    }

    default:
      break;
  }
}

module.exports = { leadStartHandler, handleFsmMessage };
