# syntax=docker/dockerfile:1

# ---- Build the static site -------------------------------------------------------------------
# Runs on the build host's architecture; the output is plain files, so multi-arch images only
# differ in the (cheap) nginx stage below.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Base URL the browser uses to reach the API. "/api" is proxied to the server by nginx (see
# nginx.conf.template), which keeps everything same-origin. Override for a separately hosted API.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Type-checks, then builds into dist/.
RUN npm run build

# ---- Serve it ---------------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

# *.template files are rendered with the container's environment on start-up.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Where /api/ requests are forwarded.
ENV API_UPSTREAM=http://server:8000

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
