const { Markup } = require('telegraf');

function adminMainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📝 Buyurtmalar',       'adm:leads:0')],
    [Markup.button.callback('🖼 Portfolio',          'adm:portfolio')],
    [Markup.button.callback('📊 Statistika',         'adm:stats')],
  ]);
}

function leadsListKeyboard(leads, page, total, pageSize = 5) {
  const buttons = leads.map(l => {
    const statusIcon = { new: '🆕', in_progress: '🔄', done: '✅', archived: '🗄' }[l.status] || '📝';
    const label = `${statusIcon} #${l.id} — ${l.name} (${l.contact})`;
    return [Markup.button.callback(label, `adm:lead:${l.id}`)];
  });

  // Pagination
  const nav = [];
  if (page > 0)
    nav.push(Markup.button.callback('⬅️ Oldingi', `adm:leads:${page - 1}`));
  if ((page + 1) * pageSize < total)
    nav.push(Markup.button.callback('Keyingi ➡️', `adm:leads:${page + 1}`));
  if (nav.length) buttons.push(nav);

  buttons.push([Markup.button.callback('🔙 Admin menyu', 'adm:main')]);
  return Markup.inlineKeyboard(buttons);
}

function leadDetailKeyboard(lead) {
  const nextStatus = {
    new:         ['🔄 Jarayonda', 'adm:lead_status:in_progress'],
    in_progress: ['✅ Bajarildi',  'adm:lead_status:done'],
    done:        ['🗄 Arxiv',      'adm:lead_status:archived'],
    archived:    ['🆕 Yangi',      'adm:lead_status:new'],
  }[lead.status];

  const buttons = [];
  if (nextStatus) buttons.push([Markup.button.callback(nextStatus[0], `${nextStatus[1]}:${lead.id}`)]);
  buttons.push([Markup.button.callback('🗑 O\'chirish', `adm:lead_del:${lead.id}`)]);
  buttons.push([Markup.button.callback('🔙 Buyurtmalar', 'adm:leads:0')]);
  return Markup.inlineKeyboard(buttons);
}

function portfolioMenuKeyboard(categories) {
  const buttons = categories.map(cat =>
    [Markup.button.callback(`📂 ${cat.name_uz}`, `adm:pf_cat:${cat.id}`)]
  );
  buttons.push([Markup.button.callback('🔙 Admin menyu', 'adm:main')]);
  return Markup.inlineKeyboard(buttons);
}

function portfolioCatKeyboard(categoryId, items) {
  const buttons = items.map(item => {
    const active = item.is_active ? '✅' : '❌';
    const label = `${active} ${item.title || `Rasm #${item.id}`}`;
    return [Markup.button.callback(label, `adm:pf_item:${item.id}`)];
  });
  buttons.push([Markup.button.callback('➕ Yangi rasm qo\'shish', `adm:pf_add:${categoryId}`)]);
  buttons.push([Markup.button.callback('🔙 Portfolio', 'adm:portfolio')]);
  return Markup.inlineKeyboard(buttons);
}

function portfolioItemKeyboard(item) {
  const toggleLabel = item.is_active ? '❌ Yashirish' : '✅ Ko\'rsatish';
  return Markup.inlineKeyboard([
    [Markup.button.callback(toggleLabel,      `adm:pf_toggle:${item.id}`)],
    [Markup.button.callback('🗑 O\'chirish',   `adm:pf_del:${item.id}`)],
    [Markup.button.callback('🔙 Orqaga',       `adm:pf_cat:${item.category_id}`)],
  ]);
}

function cancelAdminKeyboard() {
  return Markup.keyboard([['❌ Bekor qilish']]).resize().oneTime();
}

function removeKeyboard() {
  return Markup.removeKeyboard();
}

module.exports = {
  adminMainKeyboard,
  leadsListKeyboard,
  leadDetailKeyboard,
  portfolioMenuKeyboard,
  portfolioCatKeyboard,
  portfolioItemKeyboard,
  cancelAdminKeyboard,
  removeKeyboard,
};
