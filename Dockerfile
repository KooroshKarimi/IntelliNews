FROM node:18

WORKDIR /app

# Copy root package.json and install express
COPY package.json ./
RUN npm install

# Copy intellinews and build it
COPY intellinews/ ./intellinews/
RUN cd intellinews && npm ci && npm run build

# Copy server
COPY server.js ./

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]