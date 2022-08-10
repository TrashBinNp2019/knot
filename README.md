# Knot

[![Node.js CI](https://github.com/TrashBinNp2019/knot/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/TrashBinNp2019/knot/actions/workflows/main.yml) 
[![CodeQL](https://github.com/TrashBinNp2019/knot/actions/workflows/codeql.yml/badge.svg)](https://github.com/TrashBinNp2019/knot/actions/workflows/codeql.yml)  
Internet crawler, searching for deep web stuff 🕸️.

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

# Roadmap

- Add support for other media (images, etc.)
- Efficiently compress pages
- Find something cool with this
