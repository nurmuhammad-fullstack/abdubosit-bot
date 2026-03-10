/**
 * Middleware: only allow ADMIN_TELEGRAM_ID to proceed.
 * Silently ignores non-admin users.
 */
function adminOnly(ctx, next) {
  const adminId = parseInt(process.env.ADMIN_TELEGRAM_ID, 10);
  if (!adminId || ctx.from?.id !== adminId) return;
  return next();
}

module.exports = { adminOnly };
