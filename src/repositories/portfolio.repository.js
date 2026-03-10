const { query } = require('../database/connection');

/**
 * Get all active portfolio categories.
 */
async function getCategories() {
  const res = await query(
    `SELECT * FROM portfolio_categories
     WHERE is_active = TRUE ORDER BY sort_order ASC`
  );
  return res.rows;
}

/**
 * Get category by slug.
 */
async function getCategoryBySlug(slug) {
  const res = await query(
    'SELECT * FROM portfolio_categories WHERE slug = $1 AND is_active = TRUE',
    [slug]
  );
  return res.rows[0] || null;
}

/**
 * Get category by ID.
 */
async function getCategoryById(id) {
  const res = await query(
    'SELECT * FROM portfolio_categories WHERE id = $1 AND is_active = TRUE',
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Get active portfolio items for a category.
 */
async function getItemsByCategory(categoryId) {
  const res = await query(
    `SELECT * FROM portfolio_items
     WHERE category_id = $1 AND is_active = TRUE
     ORDER BY sort_order ASC, created_at DESC`,
    [categoryId]
  );
  return res.rows;
}

/**
 * Cache Telegram file_id after first send (avoids re-uploading).
 */
async function cacheFileId(itemId, fileId) {
  await query(
    'UPDATE portfolio_items SET telegram_file_id = $1 WHERE id = $2',
    [fileId, itemId]
  );
}

module.exports = {
  getCategories,
  getCategoryBySlug,
  getCategoryById,
  getItemsByCategory,
  cacheFileId,
};
