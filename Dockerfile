# Single-stage build — keeps full node_modules so prisma CLI + @prisma/client
# are both available at runtime. Simpler and more reliable than multi-stage
# for a Prisma + SQLite app.
FROM oven/bun:1

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (full node_modules — includes prisma CLI binary)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy all source code
COPY . .

# Generate Prisma client + build Next.js
RUN bun run db:generate
RUN bun run build

# Production env
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Persistent volume for SQLite (Railway mounts /data)
RUN mkdir -p /data
ENV DATABASE_URL="file:/data/custom.db"

EXPOSE 3000

# On every start: sync schema → seed if empty → serve
CMD ["sh", "-c", "bun run db:push --accept-data-loss && bun run scripts/bootstrap.ts && bun run start"]
