# Multi-stage build using Next.js standalone output for a minimal runtime image.
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config ./packages/config
RUN pnpm install --frozen-lockfile

COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

RUN pnpm --filter @cust/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# requires next.config.ts to have `output: 'standalone'` — see the config change alongside this file
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
