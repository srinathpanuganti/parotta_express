FROM node:22-bullseye-slim
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --production=false

# Prisma schema and code
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ENV PORT=5000 \
    NODE_ENV=production

EXPOSE 5000

# On start: sync schema and seed, then run server
CMD ["sh", "-lc", "npx prisma migrate deploy && node prisma/seed.js && node server.js"]
