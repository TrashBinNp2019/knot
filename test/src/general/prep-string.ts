import * as prep from '../../../src/general/prep-string.js';
import * as cheerio from 'cheerio';
import * as tap from 'tap';

let $ = cheerio.load('<body><h1></h1></body>');

tap.test('XSS prevention', async t => {
  $('h1').html(prep.forHtml('normal & good'));
  t.equal($('h1').text(), 'normal & good', 'text preservation');

  $('h1').html(prep.forHtml('</h1> <h1>bad'));
  t.equal($('h1').get().length, 1, 'only one h1 tag');
});

tap.test('SQL inj prevention', async t => {
  t.equal(prep.forSql('normal'), 'normal');
  t.equal(prep.forSql('\' OR 1=1 #'), ' OR 1=1 #');
  t.equal(prep.forSql('\" OR 1=1 #'), ' OR 1=1 #');
  t.equal(prep.forSql('\\ OR 1=1 #'), ' OR 1=1 #');
});

tap.test('Edge cases', async t => {
  t.equal(prep.forHtml(undefined), undefined);
  t.equal(prep.forHtml(1), 1);

  t.equal(prep.forSql(undefined), undefined);
});
