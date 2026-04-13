/**
 * URL pública base para enlaces en QR y credenciales.
 * - Si APP_URL está definida, se usa (útil cuando el servidor no recibe el Host correcto).
 * - Si no, se deduce de la petición (túnel HTTPS, IP de LAN, etc.).
 */
function getPublicBaseUrl(req) {
  const explicit = process.env.APP_URL && String(process.env.APP_URL).trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  if (req) {
    const xfProto = req.get('x-forwarded-proto');
    const xfHost = req.get('x-forwarded-host');
    const host = xfHost || req.get('host');
    const proto = xfProto || (req.secure ? 'https' : 'http');
    if (host) {
      return `${proto}://${host}`;
    }
  }

  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

module.exports = { getPublicBaseUrl };
