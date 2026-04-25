# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS base

# 1. Deps stage
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
# Use cache mount for npm to speed up dependency installation
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 2. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Limit memory usage for build process
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV DATABASE_URL="postgresql://root:password@localhost:5432/dropqueue?schema=public"
ENV NEXT_TELEMETRY_DISABLED 1

RUN npx prisma generate

# Use cache mount for .next/cache to speed up builds
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# 3. Runner stage - Optimized production environment
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl

# Instead of copying the whole /app, we could use standalone, 
# but for custom server.ts we need the source or a compiled version.
# Let's keep it simple but cleaner.
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

# Use npx tsx to run the custom server
CMD ["npx", "tsx", "server.ts"]
