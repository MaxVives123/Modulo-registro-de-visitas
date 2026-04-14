const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendVisitNotification(visit) {
  if (!visit.host_email) return;

  const t = getTransporter();
  if (!t) {
    logger.warn('Email no configurado (SMTP_HOST/SMTP_USER ausentes). No se enviará notificación.');
    return;
  }

  const appName = process.env.APP_NAME || 'Sistema de Registro de Visitas';
  const companyName = process.env.COMPANY_NAME || 'la empresa';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const arrivalTime = new Date().toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  try {
    await t.sendMail({
      from: `"${appName}" <${from}>`,
      to: visit.host_email,
      subject: `Visita registrada: ${visit.visitor_name} ha llegado para verte`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8f9fa;padding:24px;border-radius:10px;">
          <div style="background:#4361ee;border-radius:8px 8px 0 0;padding:20px 24px;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Tienes una visita</h2>
            <p style="color:#c7d3ff;margin:4px 0 0;font-size:14px;">${companyName}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #dee2e6;border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 16px;color:#495057;">Hola <strong>${visit.host_name || 'equipo'}</strong>, acaba de llegar una persona que desea visitarte:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="background:#f1f3fe;">
                <td style="padding:10px 12px;color:#6c757d;width:40%;border-radius:4px 0 0 4px;">Visitante</td>
                <td style="padding:10px 12px;font-weight:700;color:#212529;">${visit.visitor_name}</td>
              </tr>
              ${visit.visitor_document ? `<tr><td style="padding:10px 12px;color:#6c757d;">Documento</td><td style="padding:10px 12px;">${visit.visitor_document}</td></tr>` : ''}
              ${visit.visitor_company ? `<tr style="background:#f1f3fe;"><td style="padding:10px 12px;color:#6c757d;">Empresa visitante</td><td style="padding:10px 12px;">${visit.visitor_company}</td></tr>` : ''}
              <tr ${!visit.visitor_company ? 'style="background:#f1f3fe;"' : ''}><td style="padding:10px 12px;color:#6c757d;">Destino / Dpto.</td><td style="padding:10px 12px;">${visit.destination}</td></tr>
              <tr style="background:#f1f3fe;"><td style="padding:10px 12px;color:#6c757d;">Motivo</td><td style="padding:10px 12px;">${visit.purpose}</td></tr>
              <tr><td style="padding:10px 12px;color:#6c757d;">Hora de llegada</td><td style="padding:10px 12px;">${arrivalTime}</td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;color:#adb5bd;">Este correo fue generado automáticamente por ${appName}. No respondas a este mensaje.</p>
          </div>
        </div>
      `,
    });
    logger.info(`Notificación de visita enviada a ${visit.host_email}`);
  } catch (err) {
    logger.error(`Error al enviar email de visita a ${visit.host_email}: ${err.message}`);
  }
}

module.exports = { sendVisitNotification };
