# syntax=docker/dockerfile:1

# bookworm (glibc), not alpine: better-sqlite3 ships prebuilt glibc binaries,
# so no compiler toolchain is needed in the final image.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------- deps
FROM base AS deps
WORKDIR /app
# python3/make/g++ are only a fallback for when no prebuilt binary matches.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# --------------------------------------------------------------- build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------- run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /data \
 && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Belt and braces: the trace already picks up better_sqlite3.node, but a miss
# here fails at runtime rather than at build, so the addon is copied outright.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

USER nextjs
EXPOSE 3000

# The SQLite file lives here — mount a persistent volume on /data in EasyPanel.
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
