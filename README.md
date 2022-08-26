# Knot

[![Node.js CI](https://github.com/TrashBinNp2019/knot/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/TrashBinNp2019/knot/actions/workflows/main.yml) 
[![CodeQL](https://github.com/TrashBinNp2019/knot/actions/workflows/codeql.yml/badge.svg)](https://github.com/TrashBinNp2019/knot/actions/workflows/codeql.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/08439d9f9a68256640f1/maintainability)](https://codeclimate.com/github/TrashBinNp2019/knot/maintainability)
  
Internet crawler, searching for deep web stuff 🕸️.

# Why ?

I need projects to practice and deep web stalking is pretty cool. As for you, please use with caution.

# Setup

In order to build the app, run:
```
npm i
npm run build
npm run test-build
```
After that, visit _config_ directory for configurations.  
> This package uses Postgres for storage. Please make sure that information in _postgres-config.json_ is valid.

# Usage

## Standard

Once package is built and postgres is available, crawler can be started with:
```
npm run crawler
```
To view the results, start the search engine:
```
npm run page
```

## Docker

Having docker insalled and running, execute:
```
docker compose up
```
Services will be available on ports 8080 and 8081.

## Development mode

You can run services without building, directly from the source code.
However, be ready for various security and performance setbacks:
```
npm run crawler-dev
```
And:
```
npm run page-dev
```

# Roadmap

- ~~Reach and retain 100% coverage on engine code~~
- Integrate more well-developed libraries for code quality:
  - ~~Redux~~
  - Prisma
- ~~Add support for other media (images)~~
- Efficiently compress pages
- Optimise bandwidth usage by interfaces
- Find something cool with this
