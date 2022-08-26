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
        generate_random_targets: gen_rand_tgts,
      })
    },
    '../../../src/crawler/state/store.ts': {
      store: {
        dispatch: (action) => {
          if (debug) console.log(action);
          if (action.type.includes('log')) {
            logs.push(JSON.stringify(action.payload));
          } else if (action.type.includes('examined')) {
            total_examined += action.payload.count;
          } else if (action.type.includes('valid')) {
            total_valid += action.payload.count;
          } else if (action.type.includes('paused')) {
            pause_req = false;
          }
        },
        getState: () => ({
          pausable: {
            pausePending: pause_req,
          }
        }),
      }
    }
  }
);

let debug = false;
let logs:string[] = [];
let total_examined = 0;
let total_valid = 0;
let pause_req = false;
tap.beforeEach(() => {
  logs = [];
  total_examined = 0;
  total_valid = 0;
  pause_req = false;
})

let gen_rand_tgts = false;

const index = fs.readFileSync('test/src/crawler/static/index.html');
let $: cheerio.CheerioAPI;
function reset() {
  $ = cheerio.load(index);
}
reset()

let app = express();
const port = Math.trunc(Math.random() * 100 + 60500);
let onRequest: (req:express.Request, res:express.Response) => void;
app.get(/./, (req, res) => {
  onRequest(req, res);
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
  tap.match(logs[logs.length - 1], '"title":"Title"', 'should send correct logs');
  tap.equal(total_valid, 1, 'should send correct valid count');
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
  t.same(visited.sort(), [
    '/subdir/page.html',
    '/subdir/page.html?q=1',
    '/subdir/page2.html',
    '/subdir2',
  ]);
  
  tap.equal(total_examined, 5, 'should send correct examined count');
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
    },
    pushImg: () => {},
  }
  
  await engine.generate({ 
    targets: [`localhost:${port}/subdir/page.html`], 
    db: validator, repetitions: 2, generate_random_targets: false 
  }).next();
  
  tap.equal(total_valid, 1, 'should send correct valid count');
  t.same(inspected, [ addr ]);
});

tap.test('Repetitions', async t => {
  reset();
  await engine.generate({ 
    targets: [addr],
    repetitions: 1,
  }).next();

  tap.equal(total_examined, 1);
  t.ok(logs.find(l => /finished/i.test(l)));
});

tap.test('Run for', async t => {
  reset();
  $('#google').remove();

  await engine.generate({
    targets: [addr],
    run_for: '1ms',
  }).next();

  tap.equal(total_examined, 1, 'should terminate after scanning single target');
  t.ok(logs.find(l => /finished/i.test(l)));

  await engine.generate({
    targets: [addr],
    run_for: '10h',
  }).next();

  tap.equal(total_examined, 5, 'should terminate after scanning all targets despite 10 hours remaining');
});

tap.test('Pausability', async t => {
  gen_rand_tgts = true;

  let en = engine.generate({ 
    targets: [],
  });
  setTimeout(() => {
    pause_req = true;
  }, 100);
  await en.next();

  t.equal(total_examined, 5);
  t.ok(logs.find(l => /paused/i.test(l)));

  logs = [];
  setTimeout(() => {
    pause_req = true;
  }, 100);
  await en.next();
  t.equal(total_examined, 10);
  t.ok(logs.find(l => /resuming/i.test(l)));
  t.ok(logs.find(l => /paused/i.test(l)));

  logs = [];
  setTimeout(() => {
    pause_req = true;
  }, 100);
  await en.next();
  t.equal(total_examined, 15);
  t.ok(logs.find(l => /resuming/i.test(l)));
  t.ok(logs.find(l => /paused/i.test(l)));

  gen_rand_tgts = false;
});

tap.test('Empty targets list', async t => {
  await engine.generate({ targets: [] }).next();
  t.ok(logs.find(l => /no targets/i.test(l)), 'logs should contain a "no targets" message');
});

tap.test('Random target generation', async t => {
  gen_rand_tgts = true;

  await engine.generate({ 
    repetitions: 2,
  }).next();
  t.equal(total_examined, 10);

  gen_rand_tgts = false;
});

tap.test('Should drop targets if cap is exceeded', async t => {
  await engine.generate({ 
    targets: ['', '', '', '', '', ''], 
  }).next();
  t.equal(total_examined, 0);
  t.ok(logs.find(l => /cap exceeded/i.test(l)), 'logs should contain a "cap exceeded" message');
});

tap.test('Error handling', async t => {
  onRequest = (req, res) => {
    res.set('Content-Type', 'none');
  }

  await engine.generate({
    targets: [addr],
  }).next();
  t.ok(logs.find(l => /none/i.test(l)), 'logs should contain a error message referencing unrecognized content type');

  onRequest = () => {};
});
