const uz = require('../locales/uz.json');
const ru = require('../locales/ru.json');
const en = require('../locales/en.json');

const locales = { uz, ru, en };

/**
 * Get translated string by dot-notation key.
 * @param {string} lang  - 'uz' | 'ru' | 'en'
 * @param {string} key   - e.g. 'main_menu.about'
 * @param {object} vars  - optional template vars: { name: 'Ali' }
 * @returns {string}
 */
function t(lang, key, vars = {}) {
  const locale = locales[lang] || locales.en;
  const value = key.split('.').reduce((obj, k) => obj?.[k], locale) ?? key;

  // Replace {varName} placeholders
  return String(value).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

module.exports = { t };
