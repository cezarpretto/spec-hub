FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HF_HOME=/app/.cache

RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 --gid 1001 app
USER app

COPY --chown=app:app --from=build /app/node_modules node_modules
COPY --chown=app:app --from=build /app/dist dist
COPY --chown=app:app --from=build /app/package.json package.json

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||'3456')+'/health').then(function(r){return r.ok?process.exit(0):process.exit(1)})"

CMD ["node", "dist/start.js"]
