# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 BASE_PATH=/mypremiereplus \
    DATA_DIRECTORY=/data DB_PATH=/data/archive.sqlite
COPY --from=build --chown=node:node /app /app
RUN mkdir /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD node -e 'fetch("http://127.0.0.1:8787" + process.env.BASE_PATH + "/api/health").then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))'
CMD ["node", "--import", "tsx", "scripts/start-hosted.mjs"]
