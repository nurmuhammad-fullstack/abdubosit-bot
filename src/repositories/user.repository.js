const { query } = require('../database/connection');

/**
 * Find user by Telegram ID.
 */
async function findByTelegramId(telegramId) {
  const res = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return res.rows[0] || null;
}

/**
 * Create a new user.
 */
async function create({ telegram_id, username, first_name, last_name, language = 'en' }) {
  const res = await query(
    `INSERT INTO users (telegram_id, username, first_name, last_name, language)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [telegram_id, username, first_name, last_name, language]
  );
  return res.rows[0];
}

/**
 * Update user language.
 */
async function setLanguage(telegramId, language) {
  const res = await query(
    `UPDATE users SET language = $1, updated_at = NOW()
     WHERE telegram_id = $2 RETURNING *`,
    [language, telegramId]
  );
  return res.rows[0];
}

/**
 * Update FSM state and data.
 */
async function setFsmState(telegramId, state, data = {}) {
  const res = await query(
    `UPDATE users SET fsm_state = $1, fsm_data = $2, updated_at = NOW()
     WHERE telegram_id = $3 RETURNING *`,
    [state, JSON.stringify(data), telegramId]
  );
  return res.rows[0];
}

/**
 * Clear FSM (reset to idle).
 */
async function clearFsm(telegramId) {
  return setFsmState(telegramId, null, {});
}

module.exports = { findByTelegramId, create, setLanguage, setFsmState, clearFsm };
