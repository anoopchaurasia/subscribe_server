FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app
RUN npm install pm2 -g

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .
COPY .env_prod .env

ARG process_file

EXPOSE 80

CMD [ "pm2-runtime", "ecosystem.config.js", "--only", "${process_file}" ]