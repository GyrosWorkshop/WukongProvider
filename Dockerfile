FROM node:alpine
WORKDIR /app
COPY src ./src
COPY package*.json ./
RUN npm install && npm run build
CMD ["npm", "start"]
