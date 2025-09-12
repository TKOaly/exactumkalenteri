FROM node:24-alpine
WORKDIR /app
RUN apk add caddy
COPY . .
RUN npm ci
CMD npm run build && caddy file-server --root dist/

