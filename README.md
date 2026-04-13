# Sistema de Registro de Visitas

Sistema web profesional para el registro y control de visitantes en entornos empresariales.

## Características

- **Login seguro** con JWT y rate limiting
- **Dashboard** con métricas en tiempo real, gráficos de actividad y distribución por destino
- **CRUD completo** de visitas con validación frontend y backend
- **Registro de entrada/salida** con timestamps
- **Códigos QR** únicos por visita para check-out y validación
- **Impresión de credenciales** optimizada para impresora térmica (58mm) y A4
- **Búsqueda y filtros** avanzados con paginación
- **Exportación CSV** con filtros aplicados
- **Responsive** para escritorio, tablet y móvil
- **Protección** contra SQL injection, XSS, CSRF
- **Datos de demostración** incluidos

## Requisitos

- **Docker** y **Docker Compose** instalados
  - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop)

## Inicio Rápido

### Windows

```bash
# Doble clic en start.bat o ejecutar:
start.bat
```

### Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

### Manual (cualquier OS)

```bash
# 1. Levantar base de datos y aplicación
docker-compose up -d --build db app

# 2. Esperar ~10 segundos a que PostgreSQL esté listo

# 3. Cargar datos de demostración
docker-compose run --rm seed

# 4. Abrir en el navegador
# http://localhost:3000
```

## Acceso

| URL | Descripción |
|-----|-------------|
| `http://localhost:3000` | Desde el mismo equipo |
| `http://<TU-IP-LOCAL>:3000` | Desde otros dispositivos en la red |

### Credenciales

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `recepcion` | `recepcion123` | Usuario estándar |

> Para encontrar tu IP local: `ipconfig` (Windows) o `hostname -I` (Linux)

## Acceso desde otros dispositivos

1. Asegúrate de que el firewall permita conexiones al puerto 3000
2. Obtén la IP local del equipo servidor
3. Desde cualquier dispositivo en la misma red, accede a `http://<IP>:3000`

## Acceso desde Internet (Cloudflare Tunnel)

Para que alguien fuera de tu red vea la app sin abrir el router:

1. Instala el cliente: `winget install Cloudflare.cloudflared`
2. Con Docker en marcha (`docker compose up -d`), ejecuta **`start-cloudflare-tunnel.bat`** o:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3000
   ```
3. Copia la URL `https://....trycloudflare.com` que muestra la consola y compártela.
4. En tu **`.env`** añade **`TRUST_PROXY=1`** y reinicia el contenedor `app` (sin esto, el límite de peticiones puede bloquear el uso detrás del túnel).
5. Opcional: **`APP_URL`** con la URL del túnel si necesitas forzar la base de los enlaces QR; si no, se deduce del Host al abrir la app por esa URL.

Guía detallada (túnel rápido y dominio propio): [docs/CLOUDFLARE_TUNNEL.md](docs/CLOUDFLARE_TUNNEL.md)

### Si en `127.0.0.1` funciona pero con el enlace (túnel, `localhost` o la IP de la red) no

| Síntoma | Qué suele pasar |
|--------|------------------|
| **Túnel / dominio público** | Falta **`TRUST_PROXY=1`** en `.env` y reiniciar la app. |
| **`localhost` vs `127.0.0.1`** | Son **orígenes distintos**: el token guardado en el navegador no se comparte; cierra sesión o borra datos del sitio y vuelve a entrar en la URL que uses siempre. |
| **Solo desde otro PC o móvil** | Comprueba firewall en Windows (puerto 3000) y que uses la URL `http://TU_IP_LOCAL:3000`. |
| **QR que no abre en el móvil** | No uses `APP_URL` con `localhost` si el teléfono no está en el mismo equipo; deja `APP_URL` vacío para deducir la URL o pon la URL pública real. |

## Estructura del Proyecto

```
├── backend/
│   ├── config/          # Configuración de base de datos
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/       # Auth, validación, errores
│   ├── models/          # Modelos Sequelize (User, Visit)
│   ├── routes/          # Rutas API REST
│   ├── seeds/           # Datos de demostración
│   ├── utils/           # Logger, validadores
│   └── server.js        # Punto de entrada
├── frontend/
│   ├── css/             # Estilos
│   ├── js/              # Lógica frontend (SPA)
│   └── index.html       # Página principal
├── db/
│   └── init.sql         # Script inicialización DB
├── docker-compose.yml   # Orquestación de servicios
├── Dockerfile           # Imagen de la aplicación
├── railway.toml         # Config Railway (build Docker)
├── .env                 # Variables de entorno
├── start.bat            # Script inicio Windows
├── start.sh             # Script inicio Linux/macOS
├── start-cloudflare-tunnel.bat  # Túnel HTTPS (Cloudflare) hacia localhost:3000
├── cloudflared/         # Ejemplo de config para túnel con dominio propio
└── docs/CLOUDFLARE_TUNNEL.md
```

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Obtener usuario actual |

### Visitas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/visits` | Listar visitas (con filtros y paginación) |
| GET | `/api/visits/:id` | Obtener visita por ID |
| POST | `/api/visits` | Crear nueva visita |
| PUT | `/api/visits/:id` | Actualizar visita |
| DELETE | `/api/visits/:id` | Eliminar visita |
| POST | `/api/visits/:id/checkin` | Registrar entrada |
| POST | `/api/visits/:id/checkout` | Registrar salida |
| GET | `/api/visits/destinations` | Listar destinos |
| GET | `/api/visits/export/csv` | Exportar a CSV |

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Estadísticas generales |
| GET | `/api/dashboard/activity` | Datos gráfico actividad |
| GET | `/api/dashboard/destinations` | Datos gráfico destinos |
| GET | `/api/dashboard/recent` | Visitas recientes |

### QR
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/qr/generate/:id` | Generar QR de visita |
| GET | `/api/qr/validate/:code` | Validar código QR (público) |
| POST | `/api/qr/checkout/:code` | Check-out por QR (público) |
| GET | `/api/qr/credential/:id` | Datos para credencial |

## Stack Tecnológico

- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL 16 + Sequelize ORM
- **Frontend**: HTML5 + Bootstrap 5 + Chart.js
- **QR**: qrcode (npm)
- **Auth**: JWT + bcrypt
- **Seguridad**: Helmet, CORS, Rate Limiting, express-validator
- **Contenedores**: Docker + Docker Compose

## Comandos Útiles

```bash
# Ver logs de la aplicación
docker-compose logs -f app

# Reiniciar la aplicación
docker-compose restart app

# Detener todos los servicios
docker-compose down

# Detener y eliminar datos
docker-compose down -v

# Recargar datos de demo
docker-compose run --rm seed
```

## Variables de Entorno

Edita el archivo `.env` para personalizar:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto de la aplicación | `3000` |
| `DB_HOST` | Host de PostgreSQL | `db` |
| `DB_NAME` | Nombre de la base de datos | `visitas_db` |
| `DB_USER` | Usuario de la base de datos | `visitas_admin` |
| `DB_PASSWORD` | Contraseña de la base de datos | (ver .env) |
| `JWT_SECRET` | Clave secreta para tokens JWT | (ver .env) |
| `COMPANY_NAME` | Nombre de la empresa (credenciales) | `Mi Empresa S.A.` |
| `APP_URL` | URL base de la aplicación | `http://localhost:3000` |
| `DATABASE_URL` | Cadena Postgres (Railway/Render); si existe, prevalece sobre `DB_*` | — |
| `DATABASE_SSL` | Con `DATABASE_URL`, usar SSL (`true` por defecto; pon `false` si la conexión falla) | — |
| `TRUST_PROXY` | `1` detrás de proxy (Railway, túnel, etc.) | — |

## Deploy en Railway

1. Crea un proyecto en [Railway](https://railway.app), conecta este repositorio y añade el plugin **PostgreSQL**.
2. En el servicio de la app, **Variables**: referencia `DATABASE_URL` desde la base de datos (o copia el valor que muestre Railway).
3. Añade al menos: `JWT_SECRET` (cadena larga aleatoria), `NODE_ENV=production`, `TRUST_PROXY=1`.
4. Opcional: `APP_URL` con la URL pública `https://…` que te asigne Railway (QR y enlaces coherentes).
5. **Datos demo (usuarios `admin` / `admin123`)**: ver sección siguiente.

El archivo `railway.toml` fuerza build por `Dockerfile`.

### Seed en producción (cómo suele hacerse)

En equipos con Node + Postgres lo habitual es:

- **Migraciones** para el esquema (tablas); en este proyecto el servidor usa `sequelize.sync` al arrancar.
- **Seed** como script aparte que se ejecuta **a mano** o en **CI** la primera vez, no en cada request.

Opciones para ejecutar el seed **contra Railway**:

| Método | Cuándo |
|--------|--------|
| **Railway Shell** (si tu plan lo muestra) | `cd` al directorio de la app y `node backend/seeds/demo.js` con las mismas variables que el contenedor. |
| **Railway CLI** | `railway run -- npm run seed` desde la carpeta `backend` (tras `railway link`). |
| **Desde tu PC** | Usa la URL **pública** de Postgres (`DATABASE_PUBLIC_URL` en Variables del Postgres), no `postgres.railway.internal`. Luego en `backend`: `npm ci` y `npm run seed`. |

En **Windows**, con PowerShell en la raíz del proyecto:

```powershell
$env:DATABASE_URL = "PEGA_AQUI_DATABASE_PUBLIC_URL_DE_RAILWAY"
.\scripts\seed-railway.ps1
```

O manualmente:

```powershell
cd backend
npm ci
$env:DATABASE_URL = "..."
$env:NODE_ENV = "production"
npm run seed
```

**Importante:** el seed actual hace `sync({ force: true })` → **borra todas las tablas y datos** y vuelve a crearlas. Solo en bases vacías o de prueba.

### Subir el código a GitHub (primer push)

Si este proyecto es un repo nuevo en tu máquina:

```bash
cd "ruta/al/Modulo Registro de Visitas"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

(Crea antes el repositorio vacío en GitHub, sin README, o usa el que ya tengas conectado a Railway.)

## Licencia

Uso interno empresarial.
