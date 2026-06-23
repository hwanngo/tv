# syntax=docker/dockerfile:1

# ---- build stage: pnpm install + vite production build ----
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
# Install deps first (cached unless the manifest/lockfile change). pnpm-workspace.yaml
# carries the overrides in pnpm 11, so it must be present for --frozen-lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- runtime stage: unprivileged nginx serving the static SPA ----
FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
