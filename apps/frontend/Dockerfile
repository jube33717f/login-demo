FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --filter frontend --frozen-lockfile

FROM deps AS runner
COPY tsconfig.base.json ./
COPY apps/frontend apps/frontend
EXPOSE 4200
CMD ["pnpm", "--filter", "frontend", "dev"]
