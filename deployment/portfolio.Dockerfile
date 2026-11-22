FROM node:24-bookworm-slim AS portfolio
WORKDIR /site
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=portfolio /site /srv/portfolio
