# Use specific NGINX version
FROM nginx:1.25.4-alpine

# Clean default content
RUN rm -rf /usr/share/nginx/html/*

# Copy your static files
COPY . /usr/share/nginx/html

# Expose web port
EXPOSE 80