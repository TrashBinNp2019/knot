# Knot

[![Node.js CI](https://github.com/TrashBinNp2019/knot/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/TrashBinNp2019/knot/actions/workflows/main.yml) 
[![CodeQL](https://github.com/TrashBinNp2019/knot/actions/workflows/codeql.yml/badge.svg)](https://github.com/TrashBinNp2019/knot/actions/workflows/codeql.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/08439d9f9a68256640f1/maintainability)](https://codeclimate.com/github/TrashBinNp2019/knot/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/08439d9f9a68256640f1/test_coverage)](https://codeclimate.com/github/TrashBinNp2019/knot/test_coverage)  
  
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
> This package uses Postgres for storage. Unless _postgres-config.json_ is valid, **neither service will start**. See _postgres-config.json.example_ for reference.

# Usage

Once package is built, crawler can be started with:
```
npm run crawler
```
To view the results, start the search engine:
```
npm run page
```
---
Alternatively, you could run services without building, directly from the source code.
However be prepred for **major** security and performance setbacks:
```
npm run crawler-dev
```
And:
```
npm run page-dev
```

# Roadmap

- Reach and retain 100% coverage
- Integrate more well-developed libraries for code quality:
  - Redux
- Add support for other media (images, etc.)
- Efficiently compress pages
- Optimise bandwidth usage by interfaces
- Find something cool with this
