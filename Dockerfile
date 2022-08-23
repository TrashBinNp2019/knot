FROM node:18-alpine

RUN mkdir app
WORKDIR /app
COPY package.json /app/
COPY src /app/src/
COPY test/build /app/test/build
COPY tsconfig.json /app
COPY .mocharc.json /app
RUN mkdir config

RUN npm install
RUN npm run build
# RUN npx tsc
RUN npm run test-build

CMD ["npm", "start"]
EXPOSE 8080