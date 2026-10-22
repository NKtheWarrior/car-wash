# API image — Express app run directly with tsx (no compile step, matching the
# repo's `pnpm start`). Build context is the MONOREPO ROOT (see docker-compose.prod.yml).
FROM node:20-bookworm-slim

# Prisma needs OpenSSL at runtime to pick its query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# pnpm via corepack (version is pinned by package.json#packageManager).
RUN corepack enable

WORKDIR /app

# Copy the whole workspace (the .dockerignore trims node_modules, android, firmware, …).
COPY . .

# Install all deps (tsx is a devDependency and is required to run the API).
RUN pnpm install --frozen-lockfile

# Generate the Prisma client (no DB connection needed for `generate`).
RUN pnpm --filter @car-wash/db generate

ENV NODE_ENV=production
WORKDIR /app/apps/api

EXPOSE 4000
# `pnpm start` === `tsx src/index.ts`
CMD ["pnpm", "start"]
