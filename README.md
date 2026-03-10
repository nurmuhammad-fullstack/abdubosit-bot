# 🤖 Portfolio Bot

Telegram bot for **Abduvaliev Abdubosit** — Graphic & Web Designer.
Supports **Uzbek 🇺🇿 · Russian 🇷🇺 · English 🇬🇧**.

---

## Features

- 🌐 3-language support (saved per user in DB)
- 👨‍💻 About Me section
- 🎨 Services with descriptions (Logo, SMM, Web, Poster)
- 📂 Portfolio by categories with image delivery + Telegram file_id caching
- 📞 Contact info + lead form (name → design → contact)
- 📥 Admin Telegram notification on new lead
- 💾 PostgreSQL — FSM state persists across restarts
- 🐳 Docker-ready

---

## Quick Start

### 1. Clone & install
```bash
git clone <repo>
cd portfolio-bot
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in BOT_TOKEN, ADMIN_TELEGRAM_ID, DATABASE_URL
```

### 3. Run database migration
```bash
npm run migrate
```

### 4. Start in development
```bash
npm run dev
```

### 5. Production (Docker)
```bash
docker-compose up -d
```

---

## Environment Variables

| Variable            | Description                                  |
|---------------------|----------------------------------------------|
| `BOT_TOKEN`         | Token from @BotFather                        |
| `ADMIN_TELEGRAM_ID` | Your Telegram numeric ID (for lead alerts)   |
| `DATABASE_URL`      | PostgreSQL connection string                 |
| `NODE_ENV`          | `development` or `production`                |
| `WEBHOOK_URL`       | HTTPS domain for webhook (production only)   |
| `PORT`              | Server port (default 3000)                   |

---

## Adding Portfolio Images

Portfolio items are managed directly in the database:

```sql
-- First get category id
SELECT id, slug FROM portfolio_categories;

-- Insert a portfolio item
INSERT INTO portfolio_items (category_id, title, media_url, sort_order)
VALUES (1, 'My Logo Project', 'https://your-image-url.com/logo.jpg', 1);
```

Use any public image URL (Cloudinary, S3, imgbb, etc.).
The bot caches Telegram `file_id` automatically after the first send.

---

## Project Structure

```
src/
├── bot/
│   ├── handlers/         # One file per section
│   ├── keyboards/        # All Telegraf Markup builders
│   ├── middleware/        # Session (DB user attach)
│   └── index.js          # Bot wiring
├── database/
│   ├── connection.js     # pg Pool
│   └── migrate.js        # Run once to create tables
├── locales/              # uz.json  ru.json  en.json
├── repositories/         # DB queries
├── utils/
│   ├── i18n.js           # t(lang, key, vars)
│   └── logger.js         # Winston
└── index.js              # Entry point
```

---

## Bot Flow

```
/start
  └─ Language selection (🇺🇿 🇷🇺 🇬🇧)
       └─ Main Menu
            ├─ About Me
            ├─ Services
            │    ├─ Logo Design
            │    ├─ SMM Design
            │    ├─ Web Design
            │    └─ Poster & Banner
            ├─ Portfolio
            │    ├─ Logos
            │    ├─ Posters
            │    ├─ SMM Design
            │    └─ Infographics
            └─ Contact
                 └─ Leave Request
                      1. Name?
                      2. Design needed?
                      3. Contact?
                      └─ Saved to DB + Admin notified
```
# abdubosit-bot
