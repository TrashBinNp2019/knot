# Knot

Internet crawler, searching for deep web stuff 🕸️.

# Setup

In order to build the app, run:
```
npm i
npm run build
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