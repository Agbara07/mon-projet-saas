FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npm install -g typescript ts-node
RUN npx prisma generate
RUN npx tsc --skipLibCheck

EXPOSE 4000

CMD ["node", "dist/index.js"]
