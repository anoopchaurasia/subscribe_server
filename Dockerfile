FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app
RUN npm install pm2 -g

COPY package*.json ./
COPY ecosystem.config.js .

USER node

RUN npm install

COPY --chown=node:node . .
COPY .env_prod .env

ENV file default_env_value

EXPOSE 8080

CMD ["sh", "-c", "pm2-runtime start ecosystem.config.js --only ${file}" ]