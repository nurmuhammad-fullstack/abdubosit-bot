const { Markup } = require('telegraf');
const adminRepo  = require('../../repositories/admin.repository');
const logger     = require('../../utils/logger');

/* ════════════════════════════════════════════
   ADMIN STATE CONSTANTS
   ════════════════════════════════════════════ */
const ADMIN_STATE = {
  IDLE:               null,
  ADD_PHOTO_WAIT:     'ADD_PHOTO_WAIT',     // waiting for photo
  ADD_TITLE_WAIT:     'ADD_TITLE_WAIT',     // waiting for title (optional)
  LEAD_STATUS_WAIT:   'LEAD_STATUS_WAIT',   // waiting to pick status
};

/* ════════════════════════════════════════════
   KEYBOARDS
   ════════════════════════════════════════════ */

function adminMainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Buyurtmalar',         'adm:leads:0')],
    [Markup.button.callback('🖼 Portfolio qo\'shish', 'adm:portfolio:add')],
    [Markup.button.callback('📂 Portfolio ko\'rish',  'adm:portfolio:list')],
    [Markup.button.callback('📊 Statistika',          'adm:stats')],
  ]);
}

function backToAdminKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Admin menyu', 'adm:main')],
  ]);
}

function leadStatusKeyboard(leadId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🆕 Yangi',       `adm:lead:status:${leadId}:new`),
      Markup.button.callback('🔄 Jarayonda',   `adm:lead:status:${leadId}:in_progress`),
    ],
    [
      Markup.button.callback('✅ Bajarildi',   `adm:lead:status:${leadId}:done`),
      Markup.button.callback('🗑 O\'chirish',  `adm:lead:delete:${leadId}`),
    ],
    [Markup.button.callback('⬅️ Orqaga',       'adm:leads:0')],
  ]);
}

function categoryKeyboard(categories, action) {
  const buttons = categories.map(cat =>
    [Markup.button.callback(`${cat.name_uz}`, `adm:cat:${action}:${cat.id}`)]
  );
  buttons.push([Markup.button.callback('❌ Bekor qilish', 'adm:cancel')]);
  return Markup.inlineKeyboard(buttons);
}

function portfolioItemKeyboard(itemId, categoryId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🗑 O\'chirish', `adm:item:delete:${itemId}:${categoryId}`)],
    [Markup.button.callback('⬅️ Orqaga',    `adm:portfolio:cat:${categoryId}`)],
  ]);
}

/* ════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════ */

function statusEmoji(status) {
  return { new: '🆕', in_progress: '🔄', done: '✅' }[status] || '❓';
}

function formatDate(date) {
  return new Date(date).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ════════════════════════════════════════════
   /admin COMMAND
   ════════════════════════════════════════════ */

async function adminMainHandler(ctx) {
  try {
    await adminRepo.clearAdminState(ctx.from.id);
    const stats = await adminRepo.getStats();
    const text =
      `🛠 *Admin Panel*\n\n` +
      `👥 Foydalanuvchilar: *${stats.users}*\n` +
      `📋 Buyurtmalar: *${stats.leads}* (🆕 ${stats.new_leads} yangi)\n` +
      `🖼 Portfolio rasmlari: *${stats.items}*\n\n` +
      `Bo'limni tanlang:`;

    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...adminMainKeyboard() });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...adminMainKeyboard() });
    }
  } catch (err) {
    logger.error('adminMainHandler:', err);
  }
}

/* ════════════════════════════════════════════
   LEADS LIST
   ════════════════════════════════════════════ */

async function leadsListHandler(ctx, page = 0) {
  try {
    const LIMIT = 5;
    const offset = page * LIMIT;
    const [leads, total] = await Promise.all([
      adminRepo.getLeads({ limit: LIMIT, offset }),
      adminRepo.countLeads(),
    ]);

    if (!leads.length && page === 0) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(
        '📋 Hali buyurtmalar yo\'q.',
        { ...backToAdminKeyboard() }
      );
    }

    const lines = leads.map((l, i) =>
      `${offset + i + 1}. ${statusEmoji(l.status)} *${l.name}*\n` +
      `   🎨 ${l.design_request.substring(0, 40)}${l.design_request.length > 40 ? '...' : ''}\n` +
      `   📞 ${l.contact}  |  🕐 ${formatDate(l.created_at)}\n` +
      `   /lead\\_${l.id}`
    );

    const totalPages = Math.ceil(total / LIMIT);
    const navButtons = [];
    if (page > 0)              navButtons.push(Markup.button.callback('◀️ Oldingi', `adm:leads:${page - 1}`));
    if (page < totalPages - 1) navButtons.push(Markup.button.callback('Keyingi ▶️', `adm:leads:${page + 1}`));

    const keyboard = Markup.inlineKeyboard([
      ...(navButtons.length ? [navButtons] : []),
      [Markup.button.callback('⬅️ Admin menyu', 'adm:main')],
    ]);

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📋 *Buyurtmalar* (${offset + 1}–${Math.min(offset + LIMIT, total)} / ${total})\n\n` +
      lines.join('\n\n') +
      `\n\n_Batafsil ko'rish uchun /lead\\_ID yozing_`,
      { parse_mode: 'Markdown', ...keyboard }
    );
  } catch (err) {
    logger.error('leadsListHandler:', err);
  }
}

/* ── Single lead detail ── */
async function leadDetailHandler(ctx, leadId) {
  try {
    const lead = await adminRepo.getLeadById(leadId);
    if (!lead) return ctx.reply('❌ Buyurtma topilmadi.');

    const text =
      `📋 *Buyurtma #${lead.id}*\n\n` +
      `👤 Ism: *${lead.name}*\n` +
      `🎨 Dizayn: ${lead.design_request}\n` +
      `📞 Kontakt: ${lead.contact}\n` +
      `📊 Status: ${statusEmoji(lead.status)} ${lead.status}\n` +
      `🕐 Vaqt: ${formatDate(lead.created_at)}\n` +
      (lead.username ? `🔗 TG: @${lead.username}` : '');

    await ctx.reply(text, { parse_mode: 'Markdown', ...leadStatusKeyboard(lead.id) });
  } catch (err) {
    logger.error('leadDetailHandler:', err);
  }
}

/* ── Update lead status ── */
async function leadStatusHandler(ctx, leadId, status) {
  try {
    await adminRepo.updateLeadStatus(leadId, status);
    await ctx.answerCbQuery(`✅ Status: ${status}`);
    // Refresh the message
    const lead = await adminRepo.getLeadById(leadId);
    const text =
      `📋 *Buyurtma #${lead.id}*\n\n` +
      `👤 Ism: *${lead.name}*\n` +
      `🎨 Dizayn: ${lead.design_request}\n` +
      `📞 Kontakt: ${lead.contact}\n` +
      `📊 Status: ${statusEmoji(lead.status)} *${lead.status}*\n` +
      `🕐 Vaqt: ${formatDate(lead.created_at)}`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...leadStatusKeyboard(lead.id) });
  } catch (err) {
    logger.error('leadStatusHandler:', err);
  }
}

/* ── Delete lead ── */
async function leadDeleteHandler(ctx, leadId) {
  try {
    await adminRepo.deleteLead(leadId);
    await ctx.answerCbQuery('🗑 O\'chirildi');
    await leadsListHandler(ctx, 0);
  } catch (err) {
    logger.error('leadDeleteHandler:', err);
  }
}

/* ════════════════════════════════════════════
   PORTFOLIO — ADD
   ════════════════════════════════════════════ */

async function portfolioAddStart(ctx) {
  try {
    const categories = await adminRepo.getCategories();
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🖼 *Portfolio qo\'shish*\n\nQaysi kategoriyaga qo\'shamiz?',
      { parse_mode: 'Markdown', ...categoryKeyboard(categories, 'addphoto') }
    );
  } catch (err) {
    logger.error('portfolioAddStart:', err);
  }
}

/* ── Category selected → ask for photo ── */
async function portfolioAddCategorySelected(ctx, categoryId) {
  try {
    await adminRepo.setAdminState(ctx.from.id, ADMIN_STATE.ADD_PHOTO_WAIT, { category_id: categoryId });
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📸 Endi rasmni yuboring.\n\n_Bekor qilish: /admincancel_',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'adm:cancel')]]),
      }
    );
  } catch (err) {
    logger.error('portfolioAddCategorySelected:', err);
  }
}

/* ── Photo received → ask for title ── */
async function handleAdminPhoto(ctx) {
  try {
    const user = ctx.dbUser;
    if (user.admin_state !== ADMIN_STATE.ADD_PHOTO_WAIT) return;

    // Get the highest-res photo file_id
    const photos  = ctx.message.photo;
    const fileId  = photos[photos.length - 1].file_id;

    // Get direct URL via getFileLink
    let mediaUrl;
    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      mediaUrl = fileLink.href;
    } catch {
      mediaUrl = fileId; // fallback: store file_id as url
    }

    await adminRepo.setAdminState(ctx.from.id, ADMIN_STATE.ADD_TITLE_WAIT, {
      ...user.admin_data,
      media_url:        mediaUrl,
      telegram_file_id: fileId,
    });

    await ctx.reply(
      '✅ Rasm qabul qilindi!\n\n📝 Sarlavha yozing (ixtiyoriy).\nO\'tkazib yuborish uchun: /skip',
      Markup.inlineKeyboard([[Markup.button.callback('⏭ O\'tkazish', 'adm:portfolio:skiptitle')]])
    );
  } catch (err) {
    logger.error('handleAdminPhoto:', err);
  }
}

/* ── Title received → save item ── */
async function handleAdminTitle(ctx, title = null) {
  try {
    const user = ctx.dbUser;
    if (user.admin_state !== ADMIN_STATE.ADD_TITLE_WAIT) return;

    const data = user.admin_data;

    // Insert into DB, also save telegram_file_id for fast future delivery
    const { query } = require('../../database/connection');
    const res = await query(
      `INSERT INTO portfolio_items (category_id, title, media_url, telegram_file_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.category_id, title, data.media_url, data.telegram_file_id || null]
    );
    const item = res.rows[0];

    await adminRepo.clearAdminState(ctx.from.id);

    await ctx.reply(
      `✅ *Portfolio rasmi qo\'shildi!*\n\nID: #${item.id}\nSarlavha: ${title || '—'}`,
      { parse_mode: 'Markdown', ...adminMainKeyboard() }
    );
  } catch (err) {
    logger.error('handleAdminTitle:', err);
    await ctx.reply('❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
  }
}

/* ════════════════════════════════════════════
   PORTFOLIO — LIST / DELETE
   ════════════════════════════════════════════ */

async function portfolioListCategories(ctx) {
  try {
    const categories = await adminRepo.getCategories();
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📂 *Portfolio ko\'rish*\n\nKategoriyani tanlang:',
      { parse_mode: 'Markdown', ...categoryKeyboard(categories, 'view') }
    );
  } catch (err) {
    logger.error('portfolioListCategories:', err);
  }
}

async function portfolioViewCategory(ctx, categoryId) {
  try {
    const items = await adminRepo.getItemsByCategory(categoryId);
    await ctx.answerCbQuery();

    if (!items.length) {
      return ctx.editMessageText(
        '📭 Bu kategoriyada hali rasm yo\'q.',
        backToAdminKeyboard()
      );
    }

    await ctx.editMessageText(
      `📂 *${items.length} ta rasm* — batafsil ko\'rish uchun quyidagi ID larni bosing:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          ...items.map(item => [
            Markup.button.callback(
              `🖼 #${item.id} ${item.title || '(sarlavsiz)'}`,
              `adm:item:view:${item.id}:${categoryId}`
            )
          ]),
          [Markup.button.callback('⬅️ Orqaga', 'adm:portfolio:list')],
        ]),
      }
    );
  } catch (err) {
    logger.error('portfolioViewCategory:', err);
  }
}

async function portfolioViewItem(ctx, itemId, categoryId) {
  try {
    const { query } = require('../../database/connection');
    const res = await query('SELECT * FROM portfolio_items WHERE id = $1', [itemId]);
    const item = res.rows[0];
    if (!item) return ctx.answerCbQuery('Topilmadi');

    await ctx.answerCbQuery();
    await ctx.replyWithPhoto(
      item.telegram_file_id || item.media_url,
      {
        caption: `🖼 *#${item.id}* ${item.title || ''}\n📅 ${formatDate(item.created_at)}`,
        parse_mode: 'Markdown',
        ...portfolioItemKeyboard(item.id, categoryId),
      }
    );
  } catch (err) {
    logger.error('portfolioViewItem:', err);
  }
}

async function portfolioDeleteItem(ctx, itemId, categoryId) {
  try {
    await adminRepo.deletePortfolioItem(itemId);
    await ctx.answerCbQuery('🗑 O\'chirildi!');
    await portfolioViewCategory(ctx, categoryId);
  } catch (err) {
    logger.error('portfolioDeleteItem:', err);
  }
}

/* ════════════════════════════════════════════
   STATS
   ════════════════════════════════════════════ */

async function statsHandler(ctx) {
  try {
    const stats = await adminRepo.getStats();
    const categories = await adminRepo.getCategories();

    const catLines = await Promise.all(
      categories.map(async cat => {
        const count = await adminRepo.countItemsByCategory(cat.id);
        return `  • ${cat.name_uz}: *${count}* ta`;
      })
    );

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `📊 *Statistika*\n\n` +
      `👥 Foydalanuvchilar: *${stats.users}*\n` +
      `📋 Jami buyurtmalar: *${stats.leads}*\n` +
      `🆕 Yangi buyurtmalar: *${stats.new_leads}*\n` +
      `🖼 Portfolio rasmlari: *${stats.items}*\n\n` +
      `📂 *Kategoriyalar bo'yicha:*\n` +
      catLines.join('\n'),
      { parse_mode: 'Markdown', ...backToAdminKeyboard() }
    );
  } catch (err) {
    logger.error('statsHandler:', err);
  }
}

/* ════════════════════════════════════════════
   CANCEL
   ════════════════════════════════════════════ */

async function adminCancelHandler(ctx) {
  try {
    await adminRepo.clearAdminState(ctx.from.id);
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('❌ Bekor qilindi');
      await adminMainHandler(ctx);
    } else {
      await ctx.reply('❌ Bekor qilindi.', adminMainKeyboard());
    }
  } catch (err) {
    logger.error('adminCancelHandler:', err);
  }
}

/* ════════════════════════════════════════════
   MESSAGE ROUTER (for photo + text in FSM)
   ════════════════════════════════════════════ */

async function handleAdminMessage(ctx) {
  const user = ctx.dbUser;
  if (!user?.admin_state) return false; // not in admin FSM

  const state = user.admin_state;

  if (state === ADMIN_STATE.ADD_TITLE_WAIT) {
    const text = ctx.message?.text?.trim();
    if (text === '/skip' || text === '/admincancel') {
      if (text === '/admincancel') return adminCancelHandler(ctx);
      return handleAdminTitle(ctx, null);
    }
    return handleAdminTitle(ctx, text);
  }

  return false;
}

async function handleAdminPhoto2(ctx) {
  const user = ctx.dbUser;
  if (user?.admin_state === ADMIN_STATE.ADD_PHOTO_WAIT) {
    return handleAdminPhoto(ctx);
  }
  return false;
}

module.exports = {
  ADMIN_STATE,
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
};
