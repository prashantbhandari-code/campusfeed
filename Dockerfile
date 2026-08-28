FROM node:20-slim

# Install required system dependencies
RUN apt-get update -y && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first (for caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js app
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss --skip-generate && npm run start"]
