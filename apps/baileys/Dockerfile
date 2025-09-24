FROM node:20-alpine
WORKDIR /app
COPY ../../package.json ../../pnpm-workspace.yaml ./
RUN corepack enable && pnpm install
COPY ../../tsconfig.base.json ./
COPY . ./apps/baileys
RUN cd apps/baileys && pnpm build
CMD ["node", "apps/baileys/dist/index.js"]
