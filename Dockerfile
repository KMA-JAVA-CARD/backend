# --- Base Stage: Setup môi trường chung ---
FROM node:24-alpine AS base

# Kích hoạt pnpm thông qua corepack (Có sẵn trong Node 24)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# --- Stage 1: Dependencies ---
FROM base AS deps
# Copy file định nghĩa gói trước để tận dụng Docker Cache
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./prisma.config.ts

# Cài đặt dependencies (dùng frozen-lockfile để đảm bảo version y hệt dev)
RUN pnpm install --frozen-lockfile

# --- Stage 2: Builder ---
FROM base AS builder
COPY . .
# Lấy node_modules từ stage deps sang
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma Client
RUN pnpm prisma generate

# Build code (tạo thư mục dist)
RUN pnpm run build

# Dọn dẹp: Chỉ giữ lại prod dependencies để file ảnh nhẹ
RUN pnpm prune --prod

# --- Stage 3: Production Runner ---
FROM base AS runner

# Cài OpenSSL (Bắt buộc cho Prisma Engine trên Alpine)
RUN apk add --no-cache openssl

# Copy những thứ cần thiết từ Builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 8000

# Chạy lệnh start bằng pnpm
CMD ["pnpm", "run", "start:prod"]