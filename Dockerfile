FROM node:18

WORKDIR /app
COPY . .

# package.json が無い前提で、Docker build時に作成して依存導入
RUN npm init -y \
  && npm pkg set type=module \
  && npm install express@4 node-fetch@3

EXPOSE 3000
CMD ["node", "server.js"]