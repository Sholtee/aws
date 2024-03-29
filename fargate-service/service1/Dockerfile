#############################################
# Dockerfile
#
# Author: Denes Solti
#############################################
FROM node:18.20.0-bullseye-slim

RUN apt-get update

WORKDIR /code/service/

COPY * .

RUN npm install

EXPOSE 1986

CMD [ "node", "index.mjs" ]

