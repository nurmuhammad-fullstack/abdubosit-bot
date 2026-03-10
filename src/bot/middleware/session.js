const userRepo = require('../../repositories/user.repository');
const logger   = require('../../utils/logger');

/**
 * Middleware: load (or create) the DB user and attach to ctx.dbUser.
 * This runs on every update that has ctx.from.
 */
async function sessionMiddleware(ctx, next) {
  if (!ctx.from) return next();

  try {
    let user = await userRepo.findByTelegramId(ctx.from.id);

    if (!user) {
      user = await userRepo.create({
        telegram_id: ctx.from.id,
        username:    ctx.from.username   || null,
        first_name:  ctx.from.first_name || null,
        last_name:   ctx.from.last_name  || null,
        language:    'en',
      });
      logger.info(`New user registered: ${ctx.from.id} (@${ctx.from.username})`);
    }

    ctx.dbUser = user;
  } catch (err) {
    logger.error('sessionMiddleware error:', err);
    // Still continue — don't block the update
  }

  return next();
}

module.exports = { sessionMiddleware };
