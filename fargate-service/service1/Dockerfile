#############################################
# Dockerfile
#
# Author: Denes Solti
#############################################
FROM node:18.20.0-bullseye-slim

RUN apt-get update
RUN apt-get -y install curl

WORKDIR /code/service/

COPY * .

RUN npm install

CMD [ "node", "index.mjs" ]

