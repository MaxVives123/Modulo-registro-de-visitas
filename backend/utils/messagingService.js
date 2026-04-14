/**
 * Capa de abstracción para mensajería (SMS/WhatsApp).
 *
 * Proveedor real: Twilio (cuando TWILIO_ACCOUNT_SID está configurado y twilio instalado)
 * Proveedor mock: log en consola (para dev/test sin coste ni red)
 *
 * Variables de entorno requeridas para Twilio:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_SMS          (número E.164, ej. +34XXXXXXXXX)
 *   TWILIO_WHATSAPP_FROM     (número sin prefijo whatsapp:, ej. +14155238886)
 */
const logger = require('./logger');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  try {
    const Twilio = require('twilio');
    twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return twilioClient;
  } catch {
    logger.warn('Paquete twilio no instalado. Ejecuta: npm install twilio');
    return null;
  }
}

/**
 * Envía un mensaje a un destinatario.
 * @param {object} opts
 * @param {'sms'|'whatsapp'|'both'|'mock'} opts.channel
 * @param {string} opts.to   Número E.164 (ej. +34612345678)
 * @param {string} opts.message
 * @returns {Promise<{status:string, sid?:string, channels?:any[]}>}
 */
async function send({ channel, to, message }) {
  const client = getTwilioClient();

  if (!client || channel === 'mock') {
    logger.info(`[MOCK-MSG] ${channel} → ${to}: ${message.substring(0, 80)}`);
    return { status: 'mock', sid: `MOCK_${Date.now()}` };
  }

  const results = [];

  try {
    if (channel === 'sms' || channel === 'both') {
      const msg = await client.messages.create({
        from: process.env.TWILIO_FROM_SMS,
        to,
        body: message,
      });
      results.push({ channel: 'sms', sid: msg.sid, status: 'sent' });
      logger.info(`SMS enviado a ${to} – SID: ${msg.sid}`);
    }

    if (channel === 'whatsapp' || channel === 'both') {
      const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
      const toWa = `whatsapp:${to}`;
      const msg = await client.messages.create({ from, to: toWa, body: message });
      results.push({ channel: 'whatsapp', sid: msg.sid, status: 'sent' });
      logger.info(`WhatsApp enviado a ${to} – SID: ${msg.sid}`);
    }

    return { status: 'sent', channels: results };
  } catch (err) {
    logger.error(`Error enviando mensaje a ${to}: ${err.message}`);
    throw err;
  }
}

/**
 * Devuelve el modo activo del proveedor.
 */
function getProviderStatus() {
  const hasSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasToken = !!process.env.TWILIO_AUTH_TOKEN;
  const twilioInstalled = (() => { try { require.resolve('twilio'); return true; } catch { return false; } })();
  if (hasSid && hasToken && twilioInstalled) return { provider: 'twilio', active: true };
  return { provider: 'mock', active: false, reason: !hasSid ? 'TWILIO_ACCOUNT_SID no configurado' : !twilioInstalled ? 'Paquete twilio no instalado' : 'TWILIO_AUTH_TOKEN no configurado' };
}

module.exports = { send, getProviderStatus };
