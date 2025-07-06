FROM node:18

WORKDIR /app

# Copy root package.json and install express
COPY package.json ./
RUN npm install

# Copy intellinews and build it
COPY intellinews/ ./intellinews/
RUN cd intellinews && npm ci && npm run build

# Copy backend
COPY backend/ ./backend/
RUN cd backend && npm ci

# Expose port
EXPOSE 8080

# Start the backend server
CMD ["node", "backend/server.js"]