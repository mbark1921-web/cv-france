FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev \
    && rm -rf /var/lib/apt/lists/*

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
RUN mkdir -p /data /data/backups \
    && chown -R node:node /app /data
ENV DATA_DIR=/data
ENV BACKUP_DIR=/data/backups
EXPOSE 3000
USER node
CMD ["npm","start"]
