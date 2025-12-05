FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
# Use non-frozen install to accommodate dependency updates in repo
RUN yarn install
COPY . .
# Build with default relative API base; Nginx will proxy /api
RUN yarn build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/build .
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
