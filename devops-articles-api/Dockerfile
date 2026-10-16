# Stage 1: Install production dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Minimal production runtime
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Run as non-privileged node user for security hardening
USER node

# Expose API port
EXPOSE 3000

# Container healthcheck using the native /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the Express server
CMD ["node", "src/server.js"]
