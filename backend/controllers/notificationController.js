const { Op } = require('sequelize');
const { Notification, User } = require('../models');

async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { rows: notifications, count: total } = await Notification.findAndCountAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      notifications,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, read: false },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
    await notif.update({ read: true });
    res.json({ notification: notif });
  } catch (error) {
    next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    await Notification.update(
      { read: true },
      { where: { user_id: req.user.id, read: false } },
    );
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
}

/**
 * Notifica a los administradores relevantes.
 * - Si se pasa companyId: notifica a admin_empresa de esa empresa.
 * - Si no: notifica a superadmin/admin globales.
 */
async function notifyAdmins(title, message, type = 'info', companyId = null) {
  try {
    let where;
    if (companyId) {
      where = {
        company_id: companyId,
        role: { [Op.in]: ['admin_empresa', 'admin'] },
        active: true,
      };
    } else {
      where = {
        role: { [Op.in]: ['superadmin', 'admin'] },
        active: true,
      };
    }

    const admins = await User.findAll({ where, attributes: ['id'] });
    const records = admins.map((a) => ({ user_id: a.id, title, message, type, read: false }));
    if (records.length) await Notification.bulkCreate(records);
  } catch (_) { /* best effort */ }
}

async function notifyUser(userId, title, message, type = 'info') {
  try {
    await Notification.create({ user_id: userId, title, message, type, read: false });
  } catch (_) { /* best effort */ }
}

module.exports = { list, unreadCount, markAsRead, markAllRead, notifyAdmins, notifyUser };
