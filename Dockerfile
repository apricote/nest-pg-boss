FROM node:18-alpine as common

WORKDIR /app

COPY *.json /app/
