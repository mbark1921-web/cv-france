FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm install --omit=dev \
    && rm -rf /var/lib/apt/lists/*

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY public ./public
RUN mkdir -p /data /data/backups
ENV DATA_DIR=/data
ENV BACKUP_DIR=/data/backups
EXPOSE 3000
CMD ["npm","start"]
