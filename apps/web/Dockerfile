FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --filter web --frozen-lockfile

FROM deps AS runner
COPY tsconfig.base.json ./
COPY apps/web apps/web
EXPOSE 4200
CMD ["pnpm", "--filter", "web", "dev"]
