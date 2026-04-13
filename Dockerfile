FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/

RUN cd backend && npm ci --only=production

COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Variables: inyectar en runtime (docker-compose, Railway, Render, etc.). No copiar .env (no va al repo).
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "backend/server.js"]
