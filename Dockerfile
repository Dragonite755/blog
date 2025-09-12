# AI-generated modification to run on node instead of nginx to accomodate ssr

# --- Build stage ---
FROM node:20 AS build
ARG VITE_BACKEND_URL=http://localhost:3001/api/v1
WORKDIR /build

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build client and server bundles
RUN npm run build

# --- Runtime stage ---
FROM node:20 AS final
WORKDIR /app

# Copy build output and package files
COPY --from=build /build/dist ./dist
COPY --from=build /build/package*.json ./

# Copy server and sitemap generator
COPY server.js .
COPY generateSitemap.js .

# Install only production dependencies, skip scripts like husky
RUN npm install --omit=dev --ignore-scripts

# Expose Cloud Run port
ENV PORT=8080
EXPOSE 8080

# Start SSR server using your start script
CMD ["npm", "run", "start"]
