# ---------- Stage 1: Build frontend (IntelliNews) ----------
FROM node:18 AS build-frontend
WORKDIR /app/intellinews

# Install frontend dependencies and build
COPY intellinews/package.json ./
COPY intellinews/package-lock.json ./
RUN npm install --legacy-peer-deps
COPY intellinews ./
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
COPY --from=build-frontend /app/intellinews/build ./backend/public

WORKDIR /app/backend
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]