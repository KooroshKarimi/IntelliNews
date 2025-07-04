# ---------- Stage 1: Build frontend ----------
FROM node:18 AS build-frontend
WORKDIR /app/frontend

# Install frontend dependencies and build
COPY frontend/package.json ./
COPY frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# ---------- Stage 2: Prepare backend ----------
FROM node:18 AS build-backend
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy backend source
COPY backend ./backend

# Copy built frontend assets into backend public folder
COPY --from=build-frontend /app/frontend/build ./backend/public

WORKDIR /app/backend
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]