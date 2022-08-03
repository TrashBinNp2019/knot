# Knot
Internet crawler, searching for deep web stuff 🕸️.
# Setup
In order to build the app, run:
```
npm i
npm run build
```
After that, visit <i>config</i> directory for configurations.
<br/>
This package uses Postgres for storage. Unless <i>postgres-config.json</i> is valid, neither service will start. See <i>postgres-config.json.example</i> for reference.
# Usage
Once package is built, crawler can be started with:
```
npm run crawler
```
To view the results, start the search engine:
```
npm run page
```

