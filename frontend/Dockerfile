FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/package.json
RUN npm install

COPY frontend frontend

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "run", "dev"]
