FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY ecosystem.config.js .

RUN npm install pm2 -g

USER node

RUN npm install

COPY --chown=node:node . .
COPY .env_prod .env

ENV file default_env_value


CMD ["sh", "-c", "node ${file}" ]