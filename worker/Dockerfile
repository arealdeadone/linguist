FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/ai-core/package.json ./packages/ai-core/
COPY worker/package.json ./worker/

RUN npm ci --workspace=@linguist/worker

COPY packages/ai-core/ ./packages/ai-core/
COPY worker/ ./worker/

CMD ["npm", "run", "start", "--workspace=@linguist/worker"]
