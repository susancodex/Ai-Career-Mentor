FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json ./frontend/
COPY lib/ ./lib/
COPY scripts/package.json ./scripts/

# Install dependencies (frozen — no surprises in production builds)
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY frontend/ ./frontend/
COPY tsconfig.base.json tsconfig.json ./

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

# vite.config.ts reads PORT and BASE_PATH at build time (dev server config)
# They are unused for production builds but must be present to avoid throwing.
ENV PORT=5173
ENV BASE_PATH=/

WORKDIR /app/frontend
RUN pnpm run build

# Production: serve static files via Nginx
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/frontend/dist/public /usr/share/nginx/html

# Minimal nginx config for SPA fallback (routing handled by the reverse proxy nginx)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|woff2?|ttf|eot|svg|png|ico)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, max-age=31536000, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
