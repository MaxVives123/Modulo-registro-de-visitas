# Cloudflare Tunnel para el sistema de visitas

Hay dos modos: **rápido (demo)** y **con dominio propio (recomendado si ya tienes dominio en Cloudflare)**.

---

## Modo rápido (sin cuenta Cloudflare obligatoria)

1. Levanta la aplicación: `docker compose up -d` (o `start.bat`).
2. Instala el cliente:
   ```bash
   winget install Cloudflare.cloudflared
   ```
3. Ejecuta en la carpeta del proyecto:
   - **Windows:** doble clic en `start-cloudflare-tunnel.bat`
   - **O en terminal:** `cloudflared tunnel --url http://127.0.0.1:3000`
4. En la consola aparecerá una URL pública HTTPS del tipo:
   `https://xxxx-xxxx.trycloudflare.com`
5. **Importante:** cada vez que reinicies `cloudflared`, la URL puede cambiar.
6. **Obligatorio con túnel:** en tu `.env` (o variables de Docker) añade **`TRUST_PROXY=1`** y reinicia la app (`docker compose up -d app`). Si no, el servidor ve todas las peticiones como la misma IP (la del túnel) y el **rate limiting** puede bloquear login o la API enseguida.
7. **Códigos QR:** Por defecto, si no defines `APP_URL`, se usa el **Host** de la petición (la URL del túnel en el navegador). Si quieres forzar una URL fija, define `APP_URL` con la misma base que muestre el túnel:
   ```env
   APP_URL=https://xxxx-xxxx.trycloudflare.com
   ```

---

## Modo con dominio fijo (Zero Trust + túnel con nombre)

Requisitos: cuenta en Cloudflare y un **dominio** cuyo DNS esté en Cloudflare.

1. Instala `cloudflared` (mismo comando `winget` de arriba).
2. Autentica (abre el navegador una vez):
   ```bash
   cloudflared tunnel login
   ```
3. Crea un túnel con nombre:
   ```bash
   cloudflared tunnel create visitas-app
   ```
   Anota el **UUID** del túnel que muestra el comando.
4. Crea el archivo de configuración (ajusta rutas si hace falta). Ejemplo `cloudflared/config.yml`:

   ```yaml
   tunnel: TU_UUID_DEL_TUNNEL
   credentials-file: C:\Users\TU_USUARIO\.cloudflared\TU_UUID.json

   ingress:
     - hostname: visitas.tudominio.com
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```

   El archivo `.json` de credenciales se genera al crear el túnel (ruta típica en Windows: `%USERPROFILE%\.cloudflared\`).

5. En el panel de Cloudflare: **Zero Trust → Networks → Tunnels**, elige el túnel y asigna el **hostname** `visitas.tudominio.com` (o el que uses).

6. Arranca el túnel:
   ```bash
   cloudflared tunnel run visitas-app
   ```
   (o el nombre que diste al crear el túnel).

7. En `.env` / Docker:
   ```env
   APP_URL=https://visitas.tudominio.com
   ```

---

## Seguridad

- El túnel expone tu app a Internet; usa **contraseñas fuertes** y **JWT_SECRET** único en producción.
- El modo rápido (`trycloudflare.com`) es adecuado para **demos**, no como sustituto de un servidor de producción con monitorización y backups.
