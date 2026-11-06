# Build com contexto na RAIZ do repo (ver docker-compose.yml) para incluir /shared.
# Debian (não Alpine) porque o Chromium do Playwright depende de glibc.
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Dependências + Chromium com as libs do sistema (versão casada com o playwright do lockfile)
COPY worker/package.json worker/package-lock.json ./worker/
RUN cd worker \
 && npm ci --omit=dev \
 && npx playwright install --with-deps chromium \
 && npm cache clean --force \
 && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY worker ./worker

WORKDIR /app/worker
USER node
CMD ["node", "index.js"]
