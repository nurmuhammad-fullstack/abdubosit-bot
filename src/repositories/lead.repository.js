const { query } = require('../database/connection');

/**
 * Save a new lead to the database.
 */
async function create({ user_id, name, design_request, contact }) {
  const res = await query(
    `INSERT INTO leads (user_id, name, design_request, contact)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user_id, name, design_request, contact]
  );
  return res.rows[0];
}

module.exports = { create };
