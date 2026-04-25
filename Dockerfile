# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS base

# 1. Deps stage
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Limit memory usage for build process
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV DATABASE_URL="postgresql://root:password@localhost:5432/dropqueue?schema=public"

RUN npx prisma generate
RUN npm run build

# 3. Runner stage - Simplest possible setup for custom server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl

COPY --from=builder /app ./

EXPOSE 3000
ENV PORT 3000

CMD ["npx", "tsx", "server.ts"]
