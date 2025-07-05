# Use multi-stage build for better optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variables for build optimization
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV CI=true
ENV GENERATE_SOURCEMAP=false

# Copy package files first for better caching
COPY intellinews/package*.json ./

# Install dependencies with retry logic
RUN npm ci --no-audit --no-fund || npm ci --no-audit --no-fund

# Copy source code
COPY intellinews/ ./

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx run directory and set permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]