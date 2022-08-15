import tap from 'tap';
import fs from 'fs';
import express from 'express';
import * as cheerio from 'cheerio';
import { Client } from '../../../src/general/abstract_client.js';
import esmock from 'esmock';
const engine = await esmock(
  '../../../src/crawler/engine.ts',
  {
    '../../../src/general/config/config_singleton.ts': {
      crawlerConfig: () => ({
        unsafe: false,
        targets_cap: 5,
        request_timeout: 200,
        log_to_console: false,
        generate_random_targets: false,
      })
    }
  }
);

const index = fs.readFileSync('test/src/crawler/static/index.html');
let $: cheerio.CheerioAPI;
function reset() {
  $ = cheerio.load(index);
}
reset()

let app = express();
const port = Math.trunc(Math.random() * 100 + 60500);
let onRequest: (req:express.Request) => void;
app.get(/./, (req, res) => {
  onRequest(req);
  if (req.url === '/subdir/page.html') {
    res.status(200).end($.html());
  } else {
    res.status(404).end();
  }
});

let addr = 'http://localhost:' + port + '/subdir/page.html';
const server = app.listen(port);
server.unref();

tap.test('Engine should send valid requests', async t => {
  let received = false;
  onRequest = (req) => {
    received = true;
  }
  await engine.crawl([addr]);
  tap.ok(received, 'express received request');
});

tap.test('Engine should crawl a page correctly', async t => {
  let visited:string[] = [];
  onRequest = (req) => {
    visited.push(req.url);
  }
  
  await engine.generate({
    targets: [`localhost:${port}/subdir/page.html`], 
    repetitions: 2
  }).next()
  t.same(visited, [
    '/subdir/page.html',
    '/subdir2',
    '/subdir/page2.html',
    '/subdir/page.html?q=1',
  ]);
  
  onRequest = (req) => {};
});

tap.test('Bot should inspect visited pages correctly', async t => {
  reset();
  $('#google').remove();
  
  let inspected:string[] = [];
  let validator:Client = {
    test: async () => { return undefined },
    push: (host) => {
      inspected.push(host.addr);
    }
  }
  
  await engine.generate({ 
    targets: [`localhost:${port}/subdir/page.html`], 
    db: validator, repetitions: 2, generate_random_targets: false 
  }).next();
  
  t.same(inspected, [ addr ]);
});