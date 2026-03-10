require('dotenv').config();

const { Telegraf }  = require('telegraf');
const logger        = require('../utils/logger');
const { t }         = require('../utils/i18n');
const { mainMenuKeyboard, removeKeyboard } = require('./keyboards');

// Middleware
const { sessionMiddleware } = require('./middleware/session');
const { adminOnly }         = require('./middleware/admin');

// User handlers
const { startHandler, languageCallbackHandler } = require('./handlers/start.handler');
const { aboutHandler }                           = require('./handlers/about.handler');
const { servicesHandler, serviceDetailHandler }  = require('./handlers/services.handler');
const { portfolioHandler, portfolioCategoryHandler } = require('./handlers/portfolio.handler');
const { contactHandler }                         = require('./handlers/contact.handler');
const { leadStartHandler, handleFsmMessage }     = require('./handlers/lead.handler');

// Admin handlers
const {
  adminMainHandler,
  leadsListHandler,
  leadDetailHandler,
  leadStatusHandler,
  leadDeleteHandler,
  portfolioAddStart,
  portfolioAddCategorySelected,
  portfolioListCategories,
  portfolioViewCategory,
  portfolioViewItem,
  portfolioDeleteItem,
  statsHandler,
  adminCancelHandler,
  handleAdminMessage,
  handleAdminPhoto2,
} = require('./handlers/admin.handler');

/* ═══════════════════════════════════════════════════ */

const bot = new Telegraf(process.env.BOT_TOKEN);

/* ── Global middleware ── */
bot.use(sessionMiddleware);

/* ═══════════════════════════════════════════════════
   USER COMMANDS
   ═══════════════════════════════════════════════════ */

bot.start(startHandler);

bot.command('cancel', async (ctx) => {
  const lang = ctx.dbUser?.language || 'en';
  const userRepo = require('../repositories/user.repository');
  await userRepo.clearFsm(ctx.from.id);
  await ctx.reply(t(lang, 'lead.cancelled'), removeKeyboard());
  await ctx.reply(t(lang, 'main_menu.title'), {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(t, lang),
  });
});

/* Language */
bot.action(/^lang:(uz|ru|en)$/, languageCallbackHandler);

/* Main menu */
bot.action('menu:main', async (ctx) => {
  try {
    const lang = ctx.dbUser?.language || 'en';
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'main_menu.title'), {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(t, lang),
    });
  } catch (_) {}
});

bot.action('menu:about',     aboutHandler);
bot.action('menu:services',  servicesHandler);
bot.action('menu:portfolio', portfolioHandler);
bot.action('menu:contact',   contactHandler);
bot.action(/^service:(logo|smm|web|poster)$/, serviceDetailHandler);
bot.action(/^portfolio:cat:\d+$/, portfolioCategoryHandler);
bot.action('lead:start', leadStartHandler);

/* ═══════════════════════════════════════════════════
   ADMIN COMMANDS  (adminOnly middleware applied)
   ═══════════════════════════════════════════════════ */

bot.command('admin', adminOnly, adminMainHandler);

bot.command('admincancel', adminOnly, adminCancelHandler);

// /lead_42  — detail view
bot.hears(/^\/lead_(\d+)$/, adminOnly, async (ctx) => {
  const leadId = parseInt(ctx.match[1], 10);
  await leadDetailHandler(ctx, leadId);
});

/* ── Admin callbacks ── */

bot.action('adm:main', adminOnly, adminMainHandler);
bot.action('adm:stats', adminOnly, statsHandler);
bot.action('adm:cancel', adminOnly, adminCancelHandler);

// Leads list with pagination: adm:leads:0
bot.action(/^adm:leads:(\d+)$/, adminOnly, async (ctx) => {
  const page = parseInt(ctx.match[1], 10);
  await leadsListHandler(ctx, page);
});

// Lead status update: adm:lead:status:42:done
bot.action(/^adm:lead:status:(\d+):(\w+)$/, adminOnly, async (ctx) => {
  await leadStatusHandler(ctx, parseInt(ctx.match[1], 10), ctx.match[2]);
});

// Lead delete: adm:lead:delete:42
bot.action(/^adm:lead:delete:(\d+)$/, adminOnly, async (ctx) => {
  await leadDeleteHandler(ctx, parseInt(ctx.match[1], 10));
});

// Portfolio add flow
bot.action('adm:portfolio:add', adminOnly, portfolioAddStart);
bot.action('adm:portfolio:list', adminOnly, portfolioListCategories);

// Category selected for adding photo: adm:cat:addphoto:3
bot.action(/^adm:cat:addphoto:(\d+)$/, adminOnly, async (ctx) => {
  await portfolioAddCategorySelected(ctx, parseInt(ctx.match[1], 10));
});

// Skip title step
bot.action('adm:portfolio:skiptitle', adminOnly, async (ctx) => {
  await ctx.answerCbQuery();
  const { handleAdminMessage: ham } = require('./handlers/admin.handler');
  // simulate /skip
  ctx.message = { text: '/skip' };
  const adminRepo = require('../repositories/admin.repository');
  const { query } = require('../database/connection');
  const data = ctx.dbUser.admin_data;
  await query(
    `INSERT INTO portfolio_items (category_id, title, media_url, telegram_file_id)
     VALUES ($1, $2, $3, $4)`,
    [data.category_id, null, data.media_url, data.telegram_file_id || null]
  );
  await adminRepo.clearAdminState(ctx.from.id);
  await ctx.reply('✅ Rasm sarlavsiz qo\'shildi!', adminMainHandler(ctx));
});

// View category items: adm:portfolio:cat:3
bot.action(/^adm:portfolio:cat:(\d+)$/, adminOnly, async (ctx) => {
  await portfolioViewCategory(ctx, parseInt(ctx.match[1], 10));
});

// View category (from list): adm:cat:view:3
bot.action(/^adm:cat:view:(\d+)$/, adminOnly, async (ctx) => {
  await portfolioViewCategory(ctx, parseInt(ctx.match[1], 10));
});

// View single item: adm:item:view:7:3
bot.action(/^adm:item:view:(\d+):(\d+)$/, adminOnly, async (ctx) => {
  await portfolioViewItem(ctx, parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10));
});

// Delete item: adm:item:delete:7:3
bot.action(/^adm:item:delete:(\d+):(\d+)$/, adminOnly, async (ctx) => {
  await portfolioDeleteItem(ctx, parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10));
});

/* ═══════════════════════════════════════════════════
   PHOTO HANDLER (admin portfolio add flow)
   ═══════════════════════════════════════════════════ */

bot.on('photo', async (ctx) => {
  // Check if admin is in photo-wait state
  const handled = await handleAdminPhoto2(ctx);
  if (!handled) {
    // Regular user sent a photo — show main menu
    const lang = ctx.dbUser?.language || 'en';
    await ctx.reply(t(lang, 'main_menu.title'), {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(t, lang),
    });
  }
});

/* ═══════════════════════════════════════════════════
   TEXT HANDLER
   ═══════════════════════════════════════════════════ */

bot.on('text', async (ctx) => {
  const user = ctx.dbUser;
  const isAdmin = ctx.from.id === parseInt(process.env.ADMIN_TELEGRAM_ID, 10);

  // Admin FSM (title input etc.)
  if (isAdmin && user?.admin_state) {
    const handled = await handleAdminMessage(ctx);
    if (handled !== false) return;
  }

  // User FSM (lead form)
  if (user?.fsm_state) {
    return handleFsmMessage(ctx, bot);
  }

  // Default: show main menu
  const lang = user?.language || 'en';
  await ctx.reply(t(lang, 'main_menu.title'), {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(t, lang),
  });
});

/* ── Global error handler ── */
bot.catch((err, ctx) => {
  logger.error(`Bot error [${ctx.updateType}]:`, err);
});

module.exports = bot;
