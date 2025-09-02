# Dockerfile (AI-generated)

# Build stage
FROM node:20 AS build
ARG VITE_BACKEND_URL=http://localhost:3001/api/v1
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:20 AS prod
WORKDIR /app

# Copy server files and built frontend
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/server.js ./
COPY --from=build /app/src ./src

# Install only production dependencies
RUN npm install --omit=dev

# Expose Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Start SSR server
CMD ["node", "server.js"]
