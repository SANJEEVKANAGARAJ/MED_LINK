FROM node:22-alpine

# Install build dependencies for libraries like bcrypt (if required on alpine)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server code
COPY . .

# Expose backend port
EXPOSE 5000

# Run in production mode
ENV NODE_ENV=production

CMD ["npm", "start"]
