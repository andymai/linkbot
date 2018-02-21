FROM node:9-alpine

RUN apk add --no-cache --virtual .gyp \
  python \
  make \
  g++ \
  && npm install \
  && apk del .gyp

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# Bundle app source
COPY . .

CMD [ "npm", "start" ]
