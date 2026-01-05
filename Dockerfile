FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install       

COPY .env /app/.env
COPY prisma/ /app/prisma/


RUN npx prisma generate

COPY . .

RUN npm run build

# Финальный этап
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --prefer-offline    

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.prisma/client ./dist/.prisma/client

EXPOSE 3001
CMD ["node", "dist/src/main.js"]