const { Op } = require('sequelize');

/**
 * Mismos filtros que listado de visitas / PDF (búsqueda, estado, fechas, destino).
 */
function buildVisitExportWhere(query) {
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    const s = `%${query.search}%`;
    where[Op.or] = [
      { visitor_name: { [Op.iLike]: s } },
      { visitor_document: { [Op.iLike]: s } },
      { visitor_company: { [Op.iLike]: s } },
      { destination: { [Op.iLike]: s } },
      { purpose: { [Op.iLike]: s } },
    ];
  }

  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) {
      where.created_at[Op.gte] = new Date(query.date_from);
    }
    if (query.date_to) {
      const dt = new Date(query.date_to);
      dt.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = dt;
    }
  }

  if (query.destination) {
    where.destination = query.destination;
  }

  return where;
}

module.exports = { buildVisitExportWhere };
