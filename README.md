# Sistema de Registro de Visitas

Aplicación web en producción para control de accesos de visitantes en entornos multiempresa, con dashboard operativo, credenciales QR y trazabilidad de entrada/salida.

## Estado del Proyecto

- **Entorno objetivo:** Producción
- **Arquitectura:** Backend API + frontend web servido por el backend
- **Despliegue soportado:** Docker Compose local y Railway (Docker)
- **CI:** GitHub Actions (quality + smoke de integración)

## Funcionalidades de Negocio

- Autenticación JWT con control de roles (`superadmin`, `admin`, `admin_empresa`, `user`)
- Gestión de visitas con flujo completo:
  - Alta de visita
  - Entrada/salida con timestamps
  - Estado operativo en dashboard
- Dashboard con:
  - métricas operativas
  - actividad semanal/mensual
  - recientes con filtro `Actuales / Todas`
- Gestión de empleados y usuarios de plataforma separada
- Importación de empleados por Excel
- Credenciales QR y validación/check-out por QR
- Exportaciones operativas (PDF/XLSX/CSV según endpoint)
- Alcance por empresa (`company_id`) con aislamiento por rol

## Stack Tecnológico

- **Backend:** Node.js, Express, Sequelize
- **Base de datos:** PostgreSQL 16
- **Frontend:** HTML, Bootstrap 5, JavaScript vanilla, Chart.js
- **Seguridad:** Helmet, rate limiting, `express-validator`, JWT
- **Contenedores:** Docker, Docker Compose
- **Calidad/CI:** Jest + GitHub Actions

## Arquitectura (alto nivel)

```
Cliente Web (SPA ligera)
        |
        v
Express API (backend/server.js)
  ├─ controllers/ (lógica de negocio)
  ├─ middleware/ (auth, validación, errores)
  ├─ routes/     (API REST)
  └─ models/     (Sequelize)
        |
        v
PostgreSQL
```

## Requisitos

- Docker Desktop (o Docker Engine + Compose)
- Git

## Arranque Rápido

### Opción 1: scripts del proyecto

**Windows**
```bash
start.bat
```

**Linux/macOS**
```bash
chmod +x start.sh
./start.sh
```

### Opción 2: manual

```bash
# Desde raíz del repo
docker compose up -d --build db app
docker compose run --rm seed
```

Aplicación:
- `http://localhost:3000`

## Credenciales Demo

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `recepcion` | `recepcion123` | Usuario estándar |

> Solo para entornos de prueba/demo. En producción, rotar usuarios y contraseñas.

## Variables de Entorno

Configurar en `.env`:

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP de la app |
| `HOST` | Host de bind (`0.0.0.0` recomendado en contenedor) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión PostgreSQL |
| `DATABASE_URL` | DSN alternativa (si existe, prevalece sobre `DB_*`) |
| `DATABASE_SSL` | SSL para `DATABASE_URL` |
| `JWT_SECRET` | Secreto JWT (obligatorio en producción) |
| `JWT_EXPIRES_IN` | Caducidad del token |
| `APP_URL` | URL pública base para enlaces/QR |
| `TRUST_PROXY` | `1` detrás de proxy/túnel/reverse proxy |

## Seguridad Operativa (Producción)

- Cambiar `JWT_SECRET` por uno largo y único
- Definir `DB_PASSWORD` y `JWT_SECRET` en entorno; no depender de valores por defecto de `docker-compose.yml`
- No reutilizar credenciales demo
- Mantener `TRUST_PROXY=1` cuando hay proxy/túnel
- Revisar límites de rate limiting según volumen real
- Evitar exposición directa de DB al exterior
- Usar HTTPS en entorno público

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

Se ejecuta en `push` y `pull_request` a `main`:

1. **Backend quality checks**
   - `npm ci`
   - `npm run lint --if-present`
   - `npm test --if-present`
   - smoke check de módulos críticos

2. **Docker integration smoke**
   - `docker compose up -d --build db app`
   - espera de `/api/health`
   - logs automáticos en fallo
   - cleanup de contenedores

## Testing Local

```bash
cd backend
npm ci
npm test
```

## Estructura del Repositorio

```
backend/
  config/
  controllers/
  middleware/
  models/
  routes/
  seeds/
  tests/
  utils/
  server.js
frontend/
  css/
  js/
  index.html
db/
  init.sql
.github/workflows/
  ci.yml
docker-compose.yml
Dockerfile
railway.toml
```

## Endpoints Principales

### Auth
- `POST /api/auth/login`

### Dashboard
- `GET /api/dashboard/stats`
- `GET /api/dashboard/activity`
- `GET /api/dashboard/destinations`
- `GET /api/dashboard/recent`

### Visitas
- `GET /api/visits`
- `GET /api/visits/:id`
- `POST /api/visits`
- `PUT /api/visits/:id`
- `DELETE /api/visits/:id`
- `POST /api/visits/:id/checkin`
- `POST /api/visits/:id/checkout`

### Usuarios / Empleados
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PUT /api/users/:id/visitable`
- `POST /api/users/import`

### QR
- `GET /api/qr/generate/:id`
- `GET /api/qr/validate/:code`
- `POST /api/qr/checkout/:code`
- `GET /api/qr/credential/:id`

## Despliegue en Railway

1. Conectar repo en Railway
2. Añadir PostgreSQL
3. Configurar variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `TRUST_PROXY=1`)
4. Deploy por Docker (`railway.toml` + `Dockerfile`)
5. (Opcional) seed inicial con `node backend/seeds/demo.js`

## Operación y Soporte

Comandos útiles:

```bash
docker compose logs -f app
docker compose restart app
docker compose down
docker compose down -v
docker compose run --rm seed
```

## Licencia

Uso interno empresarial.
