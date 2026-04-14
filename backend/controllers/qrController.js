const QRCode = require('qrcode');
const { Visit, User, Company } = require('../models');
const logger = require('../utils/logger');
const { getPublicBaseUrl } = require('../utils/publicUrl');
const { isSuperAdmin } = require('../middleware/auth');

async function generateQR(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;
    const visit = await Visit.findOne({ where });

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    const appUrl = getPublicBaseUrl(req);
    const qrUrl = `${appUrl}/api/qr/validate/${visit.qr_code}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 250,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    res.json({
      qr_image: qrDataUrl,
      qr_url: qrUrl,
      qr_code: visit.qr_code,
    });
  } catch (error) {
    next(error);
  }
}

async function validateQR(req, res, next) {
  try {
    const { code } = req.params;

    const visit = await Visit.findOne({
      where: { qr_code: code },
      include: [{ model: User, as: 'creator', attributes: ['full_name'] }],
    });

    if (!visit) {
      return res.status(404).json({ valid: false, error: 'Código QR no válido' });
    }

    const statusLabels = {
      pending: 'Pendiente',
      checked_in: 'En instalaciones',
      checked_out: 'Salida registrada',
      cancelled: 'Cancelada',
    };

    res.json({
      valid: true,
      visit: {
        id: visit.id,
        visitor_name: visit.visitor_name,
        visitor_document: visit.visitor_document,
        visitor_company: visit.visitor_company,
        destination: visit.destination,
        purpose: visit.purpose,
        status: visit.status,
        status_label: statusLabels[visit.status],
        check_in: visit.check_in,
        check_out: visit.check_out,
        created_at: visit.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function checkOutByQR(req, res, next) {
  try {
    const { code } = req.params;

    const visit = await Visit.findOne({ where: { qr_code: code } });

    if (!visit) {
      return res.status(404).json({ error: 'Código QR no válido' });
    }

    if (visit.status !== 'checked_in') {
      return res.status(400).json({
        error: 'No se puede registrar salida',
        current_status: visit.status,
      });
    }

    await visit.update({ status: 'checked_out', check_out: new Date() });

    logger.info(`Check-out por QR: visita ${visit.id}`);
    res.json({ message: 'Salida registrada correctamente', visit });
  } catch (error) {
    next(error);
  }
}

async function getCredentialData(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const visit = await Visit.findOne({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['full_name'] },
        { model: Company, as: 'company', attributes: ['name'] },
      ],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    const appUrl = getPublicBaseUrl(req);
    const qrUrl = `${appUrl}/api/qr/validate/${visit.qr_code}`;

    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    res.json({
      company_name: visit.company?.name || process.env.COMPANY_NAME || 'Mi Empresa S.A.',
      visit: {
        id: visit.id,
        visitor_name: visit.visitor_name,
        visitor_document: visit.visitor_document,
        visitor_company: visit.visitor_company,
        destination: visit.destination,
        purpose: visit.purpose,
        check_in: visit.check_in,
        status: visit.status,
        qr_code: visit.qr_code,
        signature: visit.signature,
      },
      qr_image: qrDataUrl,
      qr_url: qrUrl,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { generateQR, validateQR, checkOutByQR, getCredentialData };
