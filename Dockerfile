FROM node:9-alpine

RUN apk add --no-cache python sqlite build-base

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Create database
RUN node data/databaseGenerator.js

CMD [ "npm", "start" ]
