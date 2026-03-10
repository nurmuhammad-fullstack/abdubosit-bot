const { Markup } = require('telegraf');

/**
 * Language selection keyboard — shown on /start
 */
function languageKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🇺🇿 O\'zbekcha', 'lang:uz'),
      Markup.button.callback('🇷🇺 Русский',    'lang:ru'),
      Markup.button.callback('🇬🇧 English',    'lang:en'),
    ],
  ]);
}

/**
 * Main menu keyboard
 */
function mainMenuKeyboard(t, lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'main_menu.about'),     'menu:about')],
    [Markup.button.callback(t(lang, 'main_menu.services'),  'menu:services')],
    [Markup.button.callback(t(lang, 'main_menu.portfolio'), 'menu:portfolio')],
    [Markup.button.callback(t(lang, 'main_menu.contact'),   'menu:contact')],
  ]);
}

/**
 * Services list keyboard
 */
function servicesKeyboard(t, lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'services.logo.title'),   'service:logo')],
    [Markup.button.callback(t(lang, 'services.smm.title'),    'service:smm')],
    [Markup.button.callback(t(lang, 'services.web.title'),    'service:web')],
    [Markup.button.callback(t(lang, 'services.poster.title'), 'service:poster')],
    [backButton(t, lang)],
  ]);
}

/**
 * Portfolio categories keyboard — built dynamically from DB
 * @param {Array}  categories - rows from portfolio_categories
 * @param {string} lang
 */
function portfolioCategoriesKeyboard(categories, t, lang) {
  const buttons = categories.map(cat =>
    [Markup.button.callback(cat[`name_${lang}`] || cat.name_en, `portfolio:cat:${cat.id}`)]
  );
  buttons.push([backButton(t, lang)]);
  return Markup.inlineKeyboard(buttons);
}

/**
 * Back to main menu button
 */
function mainMenuButton(t, lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'buttons.main_menu'), 'menu:main')],
  ]);
}

/**
 * Contact keyboard with request button
 */
function contactKeyboard(t, lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'buttons.leave_request'), 'lead:start')],
    [backButton(t, lang)],
  ]);
}

/**
 * Cancel button keyboard (used inside FSM)
 */
function cancelKeyboard(t, lang) {
  return Markup.keyboard([
    [t(lang, 'buttons.cancel')],
  ]).resize().oneTime();
}

/**
 * Remove reply keyboard
 */
function removeKeyboard() {
  return Markup.removeKeyboard();
}

/* ─── helpers ─── */
function backButton(t, lang) {
  return Markup.button.callback(t(lang, 'buttons.back'), 'menu:main');
}

module.exports = {
  languageKeyboard,
  mainMenuKeyboard,
  servicesKeyboard,
  portfolioCategoriesKeyboard,
  mainMenuButton,
  contactKeyboard,
  cancelKeyboard,
  removeKeyboard,
};
