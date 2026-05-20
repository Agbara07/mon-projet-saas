FROM node:20-slim

# OpenSSL requis par Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npx tsc --skipLibCheck

EXPOSE 4000

CMD sh -c "npx prisma migrate deploy && node dist/index.js"
