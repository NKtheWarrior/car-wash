# Web image — Next.js 15 (next build + next start). Build context is the
# MONOREPO ROOT (see docker-compose.prod.yml).
#
# IMPORTANT: NEXT_PUBLIC_API_URL is inlined into the client bundle at BUILD time,
# so it is passed as a build ARG, not just a runtime env var.
FROM node:20-bookworm-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# Public URL of the API the browser will call (and open SSE streams to).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production

RUN pnpm --filter @car-wash/web build

WORKDIR /app/apps/web
EXPOSE 3000
# `start` === `next start -p 3000`
CMD ["pnpm", "start"]
