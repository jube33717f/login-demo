FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --filter backend --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/backend apps/backend
RUN pnpm --filter backend build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/package.json apps/backend/package.json
CMD ["node", "apps/backend/dist/main.js"]
