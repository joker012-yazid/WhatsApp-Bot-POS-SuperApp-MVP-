FROM node:20-alpine
WORKDIR /app
COPY ../../package.json ../../pnpm-workspace.yaml ./
RUN corepack enable && pnpm install
COPY ../../tsconfig.base.json ./
COPY . ./apps/worker
RUN cd apps/worker && pnpm build
CMD ["node", "apps/worker/dist/index.js"]
