FROM node:alpine
WORKDIR /app
COPY src ./src
COPY package*.json ./
COPY tsconfig.json ./
COPY types ./
RUN npm install && npm run build
CMD ["npm", "start"]
