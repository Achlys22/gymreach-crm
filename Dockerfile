# ---- Build stage ----
FROM oven/bun:1 AS builder

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client + build
RUN bun run db:generate
RUN bun run build

# ---- Runner stage (smaller image) ----
FROM oven/bun:1 AS runner

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: schema, client, CLI
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Bootstrap script + backup data (1,893 leads)
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib ./src/lib
COPY --from=builder /app/db-backup.json ./db-backup.json

# Persistent volume for SQLite (Railway mounts this)
RUN mkdir -p /data
ENV DATABASE_URL="file:/data/custom.db"

EXPOSE 3000

# On every start: sync schema → seed if empty → serve
CMD ["sh", "-c", "bun run db:push --accept-data-loss && bun run scripts/bootstrap.ts && node server.js"]
