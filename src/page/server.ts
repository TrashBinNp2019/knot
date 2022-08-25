import express from 'express';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { api } from './routers/api.js';
import * as db from '../general/postgres_client.js';
import { pageConfig as config } from '../general/config/config_singleton.js';

const app = express();
const port = config().port;

if (process.env.NODE_ENV !== 'dev') {
  /* c8 ignore next */
  if (process.env.NO_HELMET !== 'true')
    app.use(helmet({
      originAgentCluster: false,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://unpkg.com/", 
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
app.use('/api', api);

db.test().then(err => {
  if (err) {
    console.log(err);
    process.exit();
  }
  
  app.listen(port);
  console.log(`- Server started on port ${port}`);
});
