# Build com contexto na RAIZ do repo (ver docker-compose.yml) para incluir /shared.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY shared ./shared

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force

COPY backend ./backend

WORKDIR /app/backend
USER node
EXPOSE 3041
CMD ["node", "server.js"]
