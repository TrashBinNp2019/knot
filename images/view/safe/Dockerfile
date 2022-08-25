FROM node:18-alpine

RUN mkdir view
WORKDIR /view
COPY package.json .
COPY src src
COPY test/build test/build
COPY tsconfig.json .
COPY .mocharc.json .
RUN mkdir config

RUN npm install
RUN npm run build
RUN npm run test-build

CMD ["npm", "run", "page"]
EXPOSE 8080
