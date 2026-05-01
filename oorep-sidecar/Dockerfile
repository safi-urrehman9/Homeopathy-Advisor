FROM node:20-alpine

WORKDIR /app

COPY oorep-sidecar/package.json oorep-sidecar/package-lock.json .
RUN npm ci --omit=dev

COPY oorep-sidecar/src ./src

EXPOSE 5055

CMD ["npm", "start"]
