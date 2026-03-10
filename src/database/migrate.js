require('dotenv').config();
const { pool } = require('./connection');
const logger = require('../utils/logger');

const SQL = `
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id           BIGSERIAL PRIMARY KEY,
  telegram_id  BIGINT UNIQUE NOT NULL,
  username     VARCHAR(100),
  first_name   VARCHAR(100),
  last_name    VARCHAR(100),
  language     VARCHAR(5)  NOT NULL DEFAULT 'en',
  fsm_state    VARCHAR(50) DEFAULT NULL,
  fsm_data     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- PORTFOLIO CATEGORIES
CREATE TABLE IF NOT EXISTS portfolio_categories (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(80) UNIQUE NOT NULL,
  name_uz    VARCHAR(100) NOT NULL,
  name_ru    VARCHAR(100) NOT NULL,
  name_en    VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);

-- PORTFOLIO ITEMS
CREATE TABLE IF NOT EXISTS portfolio_items (
  id                 SERIAL PRIMARY KEY,
  category_id        INTEGER NOT NULL REFERENCES portfolio_categories(id) ON DELETE CASCADE,
  title              VARCHAR(200),
  media_url          VARCHAR(500) NOT NULL,
  telegram_file_id   VARCHAR(300),
  sort_order         INTEGER DEFAULT 0,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS
CREATE TABLE IF NOT EXISTS leads (
  id             SERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  name           VARCHAR(200) NOT NULL,
  design_request TEXT NOT NULL,
  contact        VARCHAR(200) NOT NULL,
  status         VARCHAR(30) DEFAULT 'new',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN FSM (separate from user FSM)
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_state  VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_data   JSONB       DEFAULT '{}';

-- SEED: default portfolio categories
INSERT INTO portfolio_categories (slug, name_uz, name_ru, name_en, sort_order)
VALUES
  ('logos',        'Logolar',     'Логотипы',   'Logos',        1),
  ('posters',      'Posterlar',   'Постеры',    'Posters',      2),
  ('smm',          'SMM Dizayn',  'SMM Дизайн', 'SMM Design',   3),
  ('infographics', 'Infografika', 'Инфографика','Infographics', 4)
ON CONFLICT (slug) DO NOTHING;
`;

(async () => {
  try {
    await pool.query(SQL);
    logger.info('✅ Database migrated successfully');
  } catch (err) {
    logger.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
})();
