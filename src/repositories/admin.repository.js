const { query } = require('../database/connection');

/* ── LEADS ── */

async function getLeads({ status = null, limit = 10, offset = 0 } = {}) {
  let sql, params;
  if (status) {
    sql = `SELECT l.*, u.username, u.first_name
           FROM leads l LEFT JOIN users u ON u.id = l.user_id
           WHERE l.status = $3
           ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`;
    params = [limit, offset, status];
  } else {
    sql = `SELECT l.*, u.username, u.first_name
           FROM leads l LEFT JOIN users u ON u.id = l.user_id
           ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`;
    params = [limit, offset];
  }
  const res = await query(sql, params);
  return res.rows;
}

async function countLeads(status = null) {
  const res = status
    ? await query("SELECT COUNT(*) FROM leads WHERE status = $1", [status])
    : await query("SELECT COUNT(*) FROM leads");
  return parseInt(res.rows[0].count, 10);
}

async function getLeadById(id) {
  const res = await query(
    `SELECT l.*, u.username, u.first_name
     FROM leads l LEFT JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

async function updateLeadStatus(id, status) {
  const res = await query(
    `UPDATE leads SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return res.rows[0];
}

async function deleteLead(id) {
  await query('DELETE FROM leads WHERE id = $1', [id]);
}

/* ── PORTFOLIO ── */

async function getCategories() {
  const res = await query(
    'SELECT * FROM portfolio_categories ORDER BY sort_order ASC'
  );
  return res.rows;
}

async function getItemsByCategory(categoryId) {
  const res = await query(
    `SELECT * FROM portfolio_items
     WHERE category_id = $1
     ORDER BY sort_order ASC, created_at DESC`,
    [categoryId]
  );
  return res.rows;
}

async function addPortfolioItem({ category_id, title, media_url }) {
  const res = await query(
    `INSERT INTO portfolio_items (category_id, title, media_url)
     VALUES ($1, $2, $3) RETURNING *`,
    [category_id, title || null, media_url]
  );
  return res.rows[0];
}

async function deletePortfolioItem(id) {
  await query('DELETE FROM portfolio_items WHERE id = $1', [id]);
}

async function countItemsByCategory(categoryId) {
  const res = await query(
    'SELECT COUNT(*) FROM portfolio_items WHERE category_id = $1',
    [categoryId]
  );
  return parseInt(res.rows[0].count, 10);
}

/* ── ADMIN FSM ── */

async function setAdminState(telegramId, state, data = {}) {
  const res = await query(
    `UPDATE users SET admin_state = $1, admin_data = $2
     WHERE telegram_id = $3 RETURNING *`,
    [state, JSON.stringify(data), telegramId]
  );
  return res.rows[0];
}

async function clearAdminState(telegramId) {
  return setAdminState(telegramId, null, {});
}

/* ── STATS ── */

async function getStats() {
  const [users, leads, items, newLeads] = await Promise.all([
    query('SELECT COUNT(*) FROM users'),
    query('SELECT COUNT(*) FROM leads'),
    query('SELECT COUNT(*) FROM portfolio_items WHERE is_active = TRUE'),
    query("SELECT COUNT(*) FROM leads WHERE status = 'new'"),
  ]);
  return {
    users:     parseInt(users.rows[0].count, 10),
    leads:     parseInt(leads.rows[0].count, 10),
    items:     parseInt(items.rows[0].count, 10),
    new_leads: parseInt(newLeads.rows[0].count, 10),
  };
}

module.exports = {
  getLeads, countLeads, getLeadById, updateLeadStatus, deleteLead,
  getCategories, getItemsByCategory, addPortfolioItem, deletePortfolioItem, countItemsByCategory,
  setAdminState, clearAdminState,
  getStats,
};
