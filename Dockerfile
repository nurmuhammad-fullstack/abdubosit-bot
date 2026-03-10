FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Run migrations then start the bot
CMD ["sh", "-c", "node src/database/migrate.js && node src/index.js"]
