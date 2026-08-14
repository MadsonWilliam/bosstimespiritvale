# bookworm (glibc), not alpine: better-sqlite3 publishes prebuilt glibc
# binaries, so this image needs no compiler toolchain at all. Verified on the
# deploy host — `npm ci` resolves better-sqlite3 from its prebuild in ~12s.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------- deps
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --------------------------------------------------------------- build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next inlines NEXT_PUBLIC_* into the client bundle at build time, so these
# have to be present here — setting them only at runtime silently ships the
# fallback values. EasyPanel passes them through as --build-arg.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_COFFEE_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_COFFEE_URL=$NEXT_PUBLIC_COFFEE_URL

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

# The standalone output already carries its traced node_modules, including
# better_sqlite3.node — verified in .next/standalone after a build.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# The SQLite file lives here — mount a persistent volume on /data.
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
