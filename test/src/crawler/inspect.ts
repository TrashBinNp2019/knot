import tap from 'tap';
import fs from 'fs';
import * as cheerio from 'cheerio';
import { Host, Image } from '../../../src/general/abstract_client.js';
import esmock from 'esmock';
const inspect = await esmock(
  '../../../src/crawler/inspect.ts',
  {
    '../../../src/general/config/config_singleton.ts': {
      crawlerConfig: () => ({
        unsafe: true,
      })
    }
  },
);

const index = fs.readFileSync('test/src/crawler/static/index.html');
let $: cheerio.CheerioAPI;
function reset() {
  $ = cheerio.load(index);
}
reset()


tap.test('getImages', async t => {
  reset();
  $('body').append(`<img src="${'1'.repeat(256)}" alt="Invalid" />`);

  let addr = 'http://example.com/subdir/page';
  t.same(inspect.getImages($, addr), [
    { src: 'http://localhost/image', dsc: 'Logo images', addr },
    { src: 'http://example.com/subdir/image2', dsc: 'Logo2 images', addr },
    { src: 'http://example.com/subdir/image3', dsc: 'Title Parent title', addr },
    { src: 'http://example.com/subdir/image4', dsc: 'Parent', addr },
  ]);
});

tap.test('getTitle', async (t) => {
  $('head').append('<title>Head Title</title>');
  $('head').append('<meta name="title" content="Meta Title" />');
  t.equal(inspect.getTitle($, ''), 'Head Title');
  
  $('title').remove();
  t.equal(inspect.getTitle($, ''), 'Title');
  
  $('h1').remove()
  t.equal(inspect.getTitle($, ''), 'SubTitle span');
  
  $('h3').remove()
  t.equal(inspect.getTitle($, ''), 'Meta Title');
  
  $('meta').remove();
  t.equal(inspect.getTitle($, 'example.com'), 'example.com');
  
  $('head').append('<title>1 2 3 4 5 6 7</title>');
  t.equal(inspect.getTitle($, ''), '1 2 3 4 5...');
  $('title').text('1'.repeat(103));
  t.equal(inspect.getTitle($, ''), '1'.repeat(100) + '...');
});

tap.test('isEmpty', async t => {
  reset();
  t.equal(inspect.isEmpty($), false, "full page shouldn't be detected as empty");

  $('body').html(''); 
  t.equal(inspect.isEmpty($), true, 'empty page should be detected as empty');

  $('body').append('<p>12345678901234</p>'); 
  t.equal(inspect.isEmpty($), true, 'a page with less then 15 symbols is empty');

  $('p').text('1234567890123456'); 
  t.equal(inspect.isEmpty($), false, 'a page with more then 15 symbols is not empty');
});

tap.test('Inspect plain HTML and extract links', async t => {
  let received:Host | undefined = undefined;
  let images: Image[] = [];
  let db = {
    test: async () => undefined,
    push: (host:Host) => {
      received = host;
    },
    pushImg: (img: Image) => {
      images.push(img);
    },
  };
  let target = 'http://localhost/subdir/page.html';
  
  let { host, links } = inspect.inspect({ 
    data: index, 
    headers: {
      'Content-Type': 'text/html',
      'x-powered-by': 'Express',
    } 
  }, target, db);
  
  t.equal(host.addr, target);
  t.equal(host.title, 'Title');
  t.equal(host.contents, 'Title Title2 SubTitle span paragraph one two');
  t.equal(host.keywords, 'Express');
  
  t.same(links, [
    'http://www.google.com',
    'http://localhost/subdir2',
    'http://localhost/subdir/page2.html',
    'http://localhost/subdir/page.html?q=1',
  ], 'links are extracted and resolved correctly from plain html');

  t.ok(received, 'host should be pushed to db');
  t.equal(host, received, 'returned host should be the same as received');
});

tap.test('Inspect HTML/JS page, extract links', async t => {
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

  let target = 'http://localhost/subdir/page.html';
  const { host, links } = inspect.inspect({
    data: Buffer.from($.html()),
    headers: {
      'Content-Type': 'text/html',
    } }, target
  );

  t.same(links, [
    'http://www.google.com',
    'http://localhost/subdir2',
    'http://localhost/subdir/page3.html',
    'http://localhost/subdir/page.html?q=js',
  ]);
  t.equal(host.title, 'Title');
  t.equal(host.contents, 'Hi User Paragraph');
  t.equal(host.keywords, '');
});

tap.test('Various edge cases', async t => {
  t.throws(() => { inspect.load({ 
      data: Buffer.from(''), 
      headers: {
        'content-type': 'none',
      },
    }, '');
  }, /\snone/, 'content type should be not present or text/html');

  t.throws(() => { inspect.load( {
    data: Buffer.from(''),
    headers: { },
  }, '1'.repeat(121) ) }, /long/, 'long url should cause loader to throw');

  reset();

  $('body').html('');
  $('body').append(`<p>${'1'.repeat(65535)}</p>`);
  t.equal(inspect.getContents($).length, 65534, 'cotntent longer then 65534 with no spaces should be trimmed to 65534');

  $('p').text('1'.repeat(65525) + ' ' + '1'.repeat(5) + ' ' + '1'.repeat(5));
  t.equal(inspect.getContents($).length, 65531, 'cotntent longer then 65534 with spaces should be trimmed to last word');
});
