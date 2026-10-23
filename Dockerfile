# One Node process serves the web build, the API and the sockets. Run exactly one instance:
# rooms live in memory.
FROM node:24-slim
WORKDIR /app

# Install first so dependency layers are cached between deploys.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
# Dev deps stay: the server runs through tsx and the web build needs vite.
RUN npm ci

COPY . .
RUN npm run content:validate && npm run build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
