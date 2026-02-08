# Stage 1: Build the React application
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY frontend/package*.json ./

# Install dependencies with legacy-peer-deps to avoid conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application source code
COPY frontend/ .

# Build the application
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
FROM nginx:stable-alpine

# Copy the custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the builder stage into a 'stockPlus' directory
COPY --from=builder /app/dist /usr/share/nginx/html/stockPlus

# Expose port 80
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]
