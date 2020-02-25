FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY ecosystem.config.js .

USER node

RUN npm install
RUN npm install pm2


COPY --chown=node:node . .
COPY .env_prod .env

RUN chmod +x listener.sh

ENV file default_env_value


CMD ["sh", "-c", "node ${file}" ]