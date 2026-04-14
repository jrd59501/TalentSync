FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY ui/package.json ui/package-lock.json ./ui/

# Install backend and frontend dependencies inside Linux so native binaries match the container OS.
RUN npm ci
RUN npm --prefix ui ci

COPY . .

RUN npm run build
RUN npm run ui:build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/ui/dist ./ui/dist

EXPOSE 3000

CMD ["node", "dist/app.js"]
