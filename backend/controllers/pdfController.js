const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { Visit, User } = require('../models');

const STATUS_LABELS = {
  pending: 'Pendiente',
  checked_in: 'En instalaciones',
  checked_out: 'Salida registrada',
  cancelled: 'Cancelada',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildWhere(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    const s = `%${query.search}%`;
    where[Op.or] = [
      { visitor_name: { [Op.iLike]: s } },
      { visitor_document: { [Op.iLike]: s } },
      { visitor_company: { [Op.iLike]: s } },
      { destination: { [Op.iLike]: s } },
    ];
  }
  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) where.created_at[Op.gte] = new Date(query.date_from);
    if (query.date_to) {
      const dt = new Date(query.date_to);
      dt.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = dt;
    }
  }
  return where;
}

async function exportListPDF(req, res, next) {
  try {
    const where = buildWhere(req.query);
    const visits = await Visit.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['full_name'] }],
      order: [['created_at', 'DESC']],
    });

    const companyName = process.env.COMPANY_NAME || 'Mi Empresa S.A.';
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=visitas_${new Date().toISOString().split('T')[0]}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Informe de Visitas', { align: 'center' });
    doc.fontSize(9).text(`Generado: ${fmtDate(new Date())}`, { align: 'center' });
    doc.moveDown(1);

    const cols = [
      { label: 'Visitante', width: 120 },
      { label: 'Documento', width: 80 },
      { label: 'Empresa', width: 100 },
      { label: 'Destino', width: 100 },
      { label: 'Estado', width: 80 },
      { label: 'Entrada', width: 110 },
      { label: 'Salida', width: 110 },
    ];
    const tableLeft = doc.page.margins.left;
    const rowHeight = 18;

    function drawRow(y, values, isHeader) {
      let x = tableLeft;
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(8);
      if (isHeader) {
        doc.rect(tableLeft, y, cols.reduce((s, c) => s + c.width, 0), rowHeight).fill('#4361ee');
        doc.fillColor('#ffffff');
      }
      cols.forEach((col, i) => {
        const text = String(values[i] || '').substring(0, 40);
        doc.text(text, x + 4, y + 4, { width: col.width - 8, height: rowHeight, ellipsis: true });
        x += col.width;
      });
      if (isHeader) doc.fillColor('#000000');
    }

    let y = doc.y;
    drawRow(y, cols.map((c) => c.label), true);
    y += rowHeight;

    for (const v of visits) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(y, cols.map((c) => c.label), true);
        y += rowHeight;
      }
      const stripe = visits.indexOf(v) % 2 === 0;
      if (stripe) {
        doc.rect(tableLeft, y, cols.reduce((s, c) => s + c.width, 0), rowHeight).fill('#f8f9fa');
        doc.fillColor('#000000');
      }
      drawRow(y, [
        v.visitor_name,
        v.visitor_document,
        v.visitor_company || '',
        v.destination,
        STATUS_LABELS[v.status] || v.status,
        fmtDate(v.check_in),
        fmtDate(v.check_out),
      ], false);
      y += rowHeight;
    }

    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(9).text(`Total de registros: ${visits.length}`, tableLeft);

    doc.end();
  } catch (error) {
    next(error);
  }
}

async function exportVisitPDF(req, res, next) {
  try {
    const visit = await Visit.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['full_name'] }],
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    const companyName = process.env.COMPANY_NAME || 'Mi Empresa S.A.';
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=visita_${visit.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(13).font('Helvetica').text('Detalle de Visita', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#4361ee');
    doc.moveDown(1);

    const fields = [
      ['Visitante', visit.visitor_name],
      ['Documento', visit.visitor_document],
      ['Empresa', visit.visitor_company || 'N/A'],
      ['Email', visit.visitor_email || 'N/A'],
      ['Teléfono', visit.visitor_phone || 'N/A'],
      ['Destino', visit.destination],
      ['Motivo', visit.purpose],
      ['Estado', STATUS_LABELS[visit.status] || visit.status],
      ['Entrada', fmtDate(visit.check_in) || 'Sin registro'],
      ['Salida', fmtDate(visit.check_out) || 'Sin registro'],
      ['Registrado por', visit.creator?.full_name || 'N/A'],
      ['Fecha creación', fmtDate(visit.created_at)],
    ];

    if (visit.notes) fields.push(['Notas', visit.notes]);

    for (const [label, value] of fields) {
      doc.font('Helvetica-Bold').fontSize(10).text(`${label}:`, { continued: true });
      doc.font('Helvetica').text(`  ${value}`);
      doc.moveDown(0.3);
    }

    if (visit.signature) {
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(10).text('Firma del Visitante:');
      doc.moveDown(0.5);
      try {
        const sigData = visit.signature.replace(/^data:image\/\w+;base64,/, '');
        const sigBuffer = Buffer.from(sigData, 'base64');
        doc.image(sigBuffer, { width: 200, height: 80 });
      } catch (_) {
        doc.font('Helvetica').fontSize(9).text('[Firma no disponible]');
      }
    }

    doc.end();
  } catch (error) {
    next(error);
  }
}

module.exports = { exportListPDF, exportVisitPDF };
