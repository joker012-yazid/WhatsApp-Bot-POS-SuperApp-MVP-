FROM node:20-alpine AS builder
WORKDIR /app
COPY ../../package.json ../../pnpm-lock.yaml* ../../pnpm-workspace.yaml ./
COPY ../../packages ./packages
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter print-server... build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY package.json ./
RUN npm install -g pnpm && pnpm install --prod --ignore-scripts
CMD ["node", "dist/index.js"]
