FROM node:20-alpine

# Build tools needed by better-sqlite3 (native addon)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/

# Ensure the data directory exists inside the image
RUN mkdir -p data

# Persist the SQLite database across container restarts
VOLUME ["/app/data"]

CMD ["node", "src/index.js"]
