FROM node:20-alpine AS builder
WORKDIR /app
COPY ../../package.json ../../pnpm-workspace.yaml ./
RUN corepack enable && pnpm install
COPY ../../tsconfig.base.json ./
COPY ../../prisma ./prisma
COPY . ./apps/api
RUN npx prisma generate --schema ./prisma/schema.prisma
RUN cd apps/api && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]
