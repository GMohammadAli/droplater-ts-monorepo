# Local Dev Dockerfile
FROM node:20-slim

WORKDIR /usr/src/app

# Install build tools (needed for some deps)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite in dev mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
