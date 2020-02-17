FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY ecosystem.config.js .

USER node

RUN npm install

COPY --chown=node:node . .
COPY .env_dev .env

ENV file default_env_value


CMD ["sh", "-c", "node ${file}" ]