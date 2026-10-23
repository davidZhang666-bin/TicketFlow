FROM node:24-bookworm-slim AS base
RUN npm install --global pnpm@11.5.0
WORKDIR /app

FROM base AS tools
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/data/package.json packages/data/package.json
RUN pnpm install --frozen-lockfile
COPY . .

FROM tools AS build
RUN pnpm build

FROM tools AS production-deps
RUN pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3200 3202

FROM nginxinc/nginx-unprivileged:1.28-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web /usr/share/nginx/html
EXPOSE 8080
