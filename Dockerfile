# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS base

# 1. Deps stage
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
# Use cache mount for npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 2. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Reduce memory limit to be safer on small VMs
ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV DATABASE_URL="postgresql://root:password@localhost:5432/dropqueue?schema=public"
ENV NEXT_TELEMETRY_DISABLED 1

RUN npx prisma generate

# Build without Turbo for better stability in Docker
RUN npm run build

# 3. Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
ENV PORT 3000

CMD ["npx", "tsx", "server.ts"]
