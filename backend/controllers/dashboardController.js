const { Op, fn, col, literal } = require('sequelize');
const { Visit } = require('../models');

async function getStats(req, res, next) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalVisits, todayVisits, currentlyInside, todayCheckouts] = await Promise.all([
      Visit.count(),
      Visit.count({ where: { created_at: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Visit.count({ where: { status: 'checked_in' } }),
      Visit.count({ where: { status: 'checked_out', check_out: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
    ]);

    res.json({
      total_visits: totalVisits,
      today_visits: todayVisits,
      currently_inside: currentlyInside,
      today_checkouts: todayCheckouts,
    });
  } catch (error) {
    next(error);
  }
}

async function getActivityChart(req, res, next) {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const activity = await Visit.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: startDate } },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });

    const labels = [];
    const data = [];
    const activityMap = {};
    activity.forEach((a) => {
      activityMap[a.date] = parseInt(a.count, 10);
    });

    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      labels.push(dateStr);
      data.push(activityMap[dateStr] || 0);
    }

    res.json({ labels, data });
  } catch (error) {
    next(error);
  }
}

async function getDestinationChart(req, res, next) {
  try {
    const destinations = await Visit.findAll({
      attributes: [
        'destination',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['destination'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10,
      raw: true,
    });

    res.json({
      labels: destinations.map((d) => d.destination),
      data: destinations.map((d) => parseInt(d.count, 10)),
    });
  } catch (error) {
    next(error);
  }
}

async function getRecentVisits(req, res, next) {
  try {
    const visits = await Visit.findAll({
      order: [['created_at', 'DESC']],
      limit: 5,
      raw: true,
    });
    res.json({ visits });
  } catch (error) {
    next(error);
  }
}

module.exports = { getStats, getActivityChart, getDestinationChart, getRecentVisits };
