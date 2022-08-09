import express from 'express';
import bodyParser from 'body-parser';
import * as db from '../general/postgres_client.js';
import * as fs from 'fs';
import helmet from 'helmet';

const config = JSON.parse(fs.readFileSync('./config/page-config.json', 'utf8'));
const app = express();
const port = config.port ?? 3000;

if (process.env.NODE_ENV !== 'dev') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com/react@18/", 
          "https://unpkg.com/react-dom@18/",
        ],
      },
    }
  }));
  app.use(express.static('build/page/static'));
  app.use('/scripts', express.static('build/general/public'));
} else {
  console.log('- Running in dev mode');
  app.use(express.static('src/page/static'));
  // next line exposes all the utils, including database structure.
  app.use('/scripts', express.static('src/general'));
}
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/search', async (req, res) => {
  res.send(JSON.stringify(await db.search(String(req.query.q))));
});

db.test().then(err => {
  if (err) {
    console.log(err);
    process.exit();
  }
  
  app.listen(port);
  console.log(`- Server started on port ${port}`);
});
