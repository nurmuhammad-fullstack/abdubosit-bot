const { t }              = require('../../utils/i18n');
const portfolioRepo      = require('../../repositories/portfolio.repository');
const { portfolioCategoriesKeyboard, mainMenuButton } = require('../keyboards');
const logger             = require('../../utils/logger');

/**
 * Split array into chunks of given size.
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Show portfolio category buttons (fetched from DB).
 */
async function portfolioHandler(ctx) {
  try {
    const lang       = ctx.dbUser?.language || 'en';
    const categories = await portfolioRepo.getCategories();

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      t(lang, 'portfolio.title'),
      { parse_mode: 'Markdown', ...portfolioCategoriesKeyboard(categories, t, lang) }
    );
  } catch (err) {
    logger.error('portfolioHandler error:', err);
  }
}

/**
 * Send portfolio images for a selected category.
 * callback data: portfolio:cat:3
 */
async function portfolioCategoryHandler(ctx) {
  try {
    const lang       = ctx.dbUser?.language || 'en';
    const categoryId = parseInt(ctx.callbackQuery.data.split(':')[2], 10);

    await ctx.answerCbQuery(t(lang, 'portfolio.loading'));

    const items = await portfolioRepo.getItemsByCategory(categoryId);

    if (!items.length) {
      return ctx.reply(t(lang, 'portfolio.empty'), mainMenuButton(t, lang));
    }

    // Notify count
    const category = await portfolioRepo.getCategoryById(categoryId);
    if (category) {
      await ctx.reply(
        `📂 *${category[`name_${lang}`]}* — ${t(lang, 'portfolio.count', { count: items.length })}`,
        { parse_mode: 'Markdown' }
      );
    }

    // Send images in groups of max 10 (Telegram limit)
    const groups = chunkArray(items, 10);

    for (const group of groups) {
      const media = group.map((item, idx) => ({
        type:    'photo',
        media:   item.telegram_file_id || item.media_url,
        caption: idx === 0 && item.title ? item.title : undefined,
      }));

      let sentMessages;
      try {
        sentMessages = await ctx.replyWithMediaGroup(media);
      } catch (sendErr) {
        // If any file_id is stale, fallback to URL for whole group
        logger.warn('Media group send failed, retrying with URLs');
        const fallbackMedia = group.map((item, idx) => ({
          type:    'photo',
          media:   item.media_url,
          caption: idx === 0 && item.title ? item.title : undefined,
        }));
        sentMessages = await ctx.replyWithMediaGroup(fallbackMedia);
      }

      // Cache telegram_file_id for items that didn't have one
      if (sentMessages) {
        for (let i = 0; i < group.length; i++) {
          if (!group[i].telegram_file_id && sentMessages[i]) {
            const photos = sentMessages[i].photo;
            if (photos && photos.length > 0) {
              const fileId = photos[photos.length - 1].file_id;
              await portfolioRepo.cacheFileId(group[i].id, fileId);
            }
          }
        }
      }
    }

    // Show back button after images
    await ctx.reply('👆', mainMenuButton(t, lang));

  } catch (err) {
    logger.error('portfolioCategoryHandler error:', err);
    const lang = ctx.dbUser?.language || 'en';
    await ctx.reply(t(lang, 'errors.general'));
  }
}

module.exports = { portfolioHandler, portfolioCategoryHandler };
