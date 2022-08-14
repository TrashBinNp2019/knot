import { assert } from 'chai';
import express from 'express';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

import * as prep from '../src/general/prep-string.js';
import * as utils from '../src/general/utils.js';

import * as types from '../src/general/config/config_types.js';
import * as configs from '../src/general/config/config_singleton.js';

import * as engine from '../src/crawler/engine.js';
import * as inspect from '../src/crawler/inspect.js';
import * as iface from '../src/crawler/interface.js';
import { Client, Host } from '../src/general/abstract_client.js';
const crawler = { engine, config: configs.crawlerConfig, iface, inspect };

let app = express();
const port = Math.trunc(Math.random() * 100 + 60500);
const index = fs.readFileSync('test/static/index.html');
let $ = cheerio.load(index);
let onRequest: (req:express.Request) => void;
app.get(/./, (req, res) => {
  onRequest(req);
  if (req.url === '/subdir/page.html') {
    res.status(200).end($.html());
  } else {
    res.status(404).end();
  }
});

let id = 1;
function makeLabel() {
  return $('#test').clone().attr('id', 'test' + id++).appendTo($('body'));
}
function reset() {
  $ = cheerio.load(index);
  id = 1;
}

const server = app.listen(port);
server.unref();

suite('Crawler', () => {
  let cfg:{} | string;
  
  suiteSetup(() => {
    // save user's config
    if (fs.existsSync('config/crawler-config.json')) {
      let data = fs.readFileSync('config/crawler-config.json');
        try {
          cfg = JSON.parse(data.toString());
        } catch (e) {
          cfg = data.toString();
        }
    }
  });
  
  suiteTeardown(() => {
    // restore user's config
    let data = typeof cfg === 'string' ? cfg : JSON.stringify(cfg, undefined, 2);
    fs.writeFile('config/crawler-config.json', data, (err) => {
      if (err) {
        console.log(err);
        process.exit();
      }
    });
  });
  
  suite('Engine', () => {
    suiteSetup(() => {
      crawler.config.request_timeout = 500;
      crawler.config.targets_cap = 5;
      crawler.config.use_web_interface = false;
      crawler.config.unsafe = false;
      crawler.config.log_to_console = false;
    });

    test('toAbsolute converts correctly', () => {
      assert.equal(utils.toAbsolute('/page', 'http://test.com'), 'http://test.com/page');
      assert.equal(utils.toAbsolute('/page', 'http://test.com/'), 'http://test.com/page');
      assert.equal(utils.toAbsolute('/page', 'http://test.com/test'), 'http://test.com/page');
      assert.equal(utils.toAbsolute('page', 'http://test.com/test'), 'http://test.com/page');
      assert.equal(utils.toAbsolute('/page', 'http://test.com/subdir/test'), 'http://test.com/page');
      assert.equal(utils.toAbsolute('page', 'http://test.com/subdir/test'), 'http://test.com/subdir/page');
      assert.equal(utils.toAbsolute('?q=page', 'http://test.com/test'), 'http://test.com/test?q=page');
      assert.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=test'), 'http://test.com/test?q=page');
      assert.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=test&q=test'), 'http://test.com/test?q=page');
      assert.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=test&q=test#test'), 'http://test.com/test?q=page');
      assert.equal(utils.toAbsolute('#bookmark', 'http://test.com/test'), undefined);
      assert.equal(utils.toAbsolute('', 'http://test.com/test'), undefined);
    });

    test('Inspect plain HTML', () => {
      let target = 'me';

      let host = crawler.inspect.inspect({ 
        data: index, 
        headers: {
          'Content-Type': 'text/html',
          'x-powered-by': 'Express',
        } }, target
      ).host;

      assert.equal(host.addr, target);
      assert.equal(host.title, 'Title');
      assert.equal(host.contents, 'Title Title2 SubTitle span paragraph one two');
      assert.equal(host.keywords, 'Express');

      reset();
      $('p').remove();

      host = crawler.inspect.inspect({ 
        data: Buffer.from($.html()), 
        headers: {
          'Content-Type': 'text/html',
          'x-powered-by': 'Express',
        } }, target
      ).host;

      assert.equal(host.addr, target);
      assert.equal(host.title, 'Title');
      assert.equal(host.contents, 'Title Title2 SubTitle span one two');
      assert.equal(host.keywords, 'Express');
    });

    test('Extract links from plain HTML', () => {
      crawler.config.unsafe = true;
      const links = crawler.inspect.inspect({ 
        data: index, 
        headers: { 
          'Content-Type': 'text/html' 
        } }, 'http://localhost/subdir/page.html'
      ).links;

      assert.deepEqual(links, [
        'http://www.google.com',
        'http://localhost/subdir2',
        'http://localhost/subdir/page2.html',
        'http://localhost/subdir/page.html?q=1',
      ]);
    });

    test('Inspect HTML/JS page, extract links', () => {
      reset();
      $('a').remove();
      $('h1:not([id])').remove();
      $('h3').text('');
      $('p').text('')
      $('li').text('');
      $('body')
        .append(`
          <script>
            document.getElementById("test").innerHTML = "Hi <span id='name'></span>";
            document.getElementById("name").innerHTML = "User";
            document.querySelector("p").innerHTML = "Paragraph";
            var el = document.createElement("a");
            el.setAttribute("href", "http://www.google.com");
            el.innerHTML = "Google";
            document.body.appendChild(el);
            el = document.createElement("a");
            el.setAttribute("href", "/subdir2");
            el.innerHTML = "subdir2";
            document.body.appendChild(el);
            el = document.createElement("a");
            el.setAttribute("href", "page3.html");
            el.innerHTML = "page3";
            document.body.appendChild(el);
            el = document.createElement("a");
            el.setAttribute("href", "?q=js");
            el.innerHTML = "query";
            document.body.appendChild(el);
            el = document.createElement("title");
            el.innerHTML = "Title";
            document.head.appendChild(el);
          </script>`
        );
      fs.writeFileSync('test/static/check.html', $.html());
      
      let target = 'http://localhost/subdir/page.html';
      const { host, links } = crawler.inspect.inspect({
        data: Buffer.from($.html()),
        headers: {
          'Content-Type': 'text/html',
        } }, target
      );
      assert.deepEqual(links, [
        'http://www.google.com',
        'http://localhost/subdir2',
        'http://localhost/subdir/page3.html',
        'http://localhost/subdir/page.html?q=js',
      ]);
      assert.equal(host.title, 'Title');
      assert.equal(host.contents, 'Hi User Paragraph');
      assert.equal(host.keywords, '');
    });

    test('Engine should send valid requests', async () => {
      let received = false;
      onRequest = (req) => {
        assert.equal(req.url, '/subdir/page.html');
        received = true;
      }

      crawler.config.request_timeout = 100;
      await crawler.engine.crawl([`http://localhost:${port}/subdir/page.html`])
      assert.isTrue(received);
      onRequest = () => {};
    }).timeout(300);

    test('Bot should crawl a page correctly', async () => {
      reset();
      let visited:string[] = [];
      onRequest = (req) => {
        visited.push(req.url);
      }

      crawler.config.request_timeout = 100;
      crawler.config.targets_cap = 10;
      crawler.config.generate_random_targets = false;

      await crawler.engine.generate({
        targets: [`localhost:${port}/subdir/page.html`], 
        repetitions: 2
      }).next()
      assert.deepEqual(visited, [
        '/subdir/page.html',
        '/subdir2',
        '/subdir/page2.html',
        '/subdir/page.html?q=1',
      ]);

      onRequest = (req) => {};
    }).timeout(3000);

    test('Bot should inspect visited pages correctly', async () => {
      reset();
      $('#google').remove();

      let inspected:string[] = [];
      let validator:Client = {
        test: async () => { return undefined },
        push: (host) => {
          inspected.push(host.addr);
        }
      }

      crawler.config.request_timeout = 100;
      crawler.config.targets_cap = 5;
      crawler.config.generate_random_targets = false;

      await crawler.engine.generate({ 
        targets: [`localhost:${port}/subdir/page.html`], 
        db: validator, repetitions: 2, generate_random_targets: false 
      }).next();

      assert.deepEqual(inspected, [ `http://localhost:${port}/subdir/page.html`, ]);
    });

    test('Engine events should work', (done) => {
      reset();
      $('#google').remove();
      onRequest = (req) => {
        caught++;
      };
      let caught = 0;
      let expect_crawled:any[] = [1, 3];
      let expect_valid:any[] = [1];

      async function check() {
        if (expect_crawled.length == 0 && expect_valid.length == 0 && caught == 4) {
          onRequest = (req) => {};
          engine.clearListeners();
          // if clearListeners doesn't work this will cause test to fail
          await crawler.engine.generate({ 
            targets: [`localhost:${port}/subdir/page.html`], 
            repetitions: 1, generate_random_targets: false 
          }).next();
          done();
        }
      }

      crawler.engine.on(crawler.iface.Events.examined, (...args) => {
        assert.isNotEmpty(expect_crawled, 'Too many "examined" events');
        assert.deepEqual(args, [expect_crawled[0]]);
        expect_crawled.shift();
        check();
      });
      crawler.engine.on(crawler.iface.Events.valid, (...args) => {
        assert.isNotEmpty(expect_valid, 'Too many "valid" events');
        assert.deepEqual(args, [expect_valid[0]]);
        expect_valid.shift();
        check();
      });

      crawler.config.targets_cap = 10;
      crawler.config.request_timeout = 200;

      crawler.engine.generate({ 
        targets: [`localhost:${port}/subdir/page.html`], 
        repetitions: 2, generate_random_targets: false 
      }).next();
    }).timeout(5000);

    test('Should work with random targets', (done) => {
      crawler.config.request_timeout = 100;
      crawler.config.targets_cap = 5;
      crawler.config.generate_random_targets = true;

      crawler.engine.on(crawler.iface.Events.examined, (...args) => {
        assert.deepEqual(args, [crawler.config.targets_cap]);
        done();
      })

      engine.generate({ generate_random_targets: true }).next();
    }).timeout(500);
  });
  
  suite('Interface', () => {
    // crawler.iface.init();
    // TODO test the page idk
  });
  
  suite('Main', () => {
    // TODO safety?
  })
});

suite('Page', () => {
  // TODO should work, safety!!
});

suite('General', () => {
  suite('Postgres Client', () => {
    // TODO safety
  });

  suite('Crawler Config', () => {
     suiteSetup(() => {
      fs.writeFileSync('config/crawler-config.json', JSON.stringify({
        request_timeout: "485ms",
        targets_cap: 157,
        use_web_interface: false,
        web_interface_port: 8089,
        unsafe: true
      }));
    });
    
    test('General usability', () => {
      let config = types.CrawlerConfig.read();

      assert.equal(config.request_timeout, 485);
      assert.equal(config.targets_cap, 157);
      assert.equal(config.use_web_interface, false);
      assert.equal(config.web_interface_port, 8089);
      assert.equal(config.unsafe, true);

      config.request_timeout = 1000;
      config.targets_cap = 1000;
      config.use_web_interface = true;
      config.web_interface_port = 1000;
      config.unsafe = false;

      assert.equal(config.request_timeout, 1000);
      assert.equal(config.targets_cap, 1000);
      assert.equal(config.use_web_interface, true);
      assert.equal(config.web_interface_port, 1000);
      assert.equal(config.unsafe, false);
    });

    test('File I/O', () => {
      let config = new types.CrawlerConfig({});
      config.request_timeout = 1000;
      config.targets_cap = 1000;
      config.use_web_interface = true;
      config.web_interface_port = 1000;
      config.unsafe = false;
      config.write();

      let data = fs.readFileSync('config/crawler-config.json');
      let json = JSON.parse(data.toString());
      assert.equal(json.request_timeout, 1000);
      assert.equal(json.targets_cap, 1000);
      assert.equal(json.use_web_interface, true);
      assert.equal(json.web_interface_port, 1000);
      assert.equal(json.unsafe, false);

      fs.writeFileSync('config/crawler-config.json', JSON.stringify({
        request_timeout: "1s",
        web_interface_port: 8089,
      }));

      config = types.CrawlerConfig.read();

      assert.equal(config.request_timeout, 1000);
      assert.equal(config.targets_cap, 1000);
      assert.equal(config.use_web_interface, true);
      assert.equal(config.web_interface_port, 8089);
      assert.equal(config.unsafe, false);
      assert.equal(config.log_to_console, true);
    });
  });
  
  
  suite('Prepare String', () => {
    test('XSS prevention', () => {
      let expected:string[] = [];
      let actual:string[] = [];
      let id = '';
      expected.push('</h1> <h1 id="mal">');
      id = '#' + makeLabel().attr('id');
      $(id).html(prep.forHtml(expected[expected.length - 1]));
      actual.push($(id).text());
      // TODO expand
      
      assert.deepEqual(actual, expected);
    });
  });
});

reset();
