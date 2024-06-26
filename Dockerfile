FROM node:20-alpine

WORKDIR /usr/app
COPY package.json ./
RUN npm install --only=prod

COPY . .

ENV PORT 8080

EXPOSE 8080
CMD [ "npm", "run", "start" ]
