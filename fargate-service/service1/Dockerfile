#############################################
# Dockerfile
#
# Author: Denes Solti
#############################################
FROM node:18.20.0-bullseye-slim

RUN apt-get update
RUN apt-get -y install curl

WORKDIR /code/service/

COPY service1/package.json service1/package-lock.json .

RUN ["npm", "ci"]

ADD cert cert
COPY service1/index.mjs .

CMD [ "node", "index.mjs" ]