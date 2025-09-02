# AI-generated modification to run on node instead of nginx to accomodate ssr

# Stage 1: Build
FROM node:20 AS build
ARG VITE_BACKEND_URL=http://localhost:3001/api/v1
WORKDIR /build
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run SSR with Node
FROM node:20 AS final
WORKDIR /app

# Copy build output
COPY --from=build /build/dist ./dist
COPY --from=build /build/server.js ./server.js
COPY --from=build /build/package*.json ./

# Install only production deps
RUN npm install --production

EXPOSE 8080
CMD ["npm", "start"]