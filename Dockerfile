# Build stage for IntelliNews React app
FROM node:18 AS build
WORKDIR /app

# Copy package files and install dependencies
COPY intellinews/package*.json ./
RUN npm ci

# Copy source code and build
COPY intellinews ./
RUN npm run build

# Production stage with nginx to serve the built app
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]