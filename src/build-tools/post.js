import * as fs from 'fs';
import fsc from 'fs-cheerio';

if (fs.existsSync('build/page/static/index.html')) {
  fsc.readFile('build/page/static/index.html').then($ => {
    $('#babel').remove();
    $('#react').removeAttr('type');
    $('#react').attr('src', 'index.js');
    $('#react').removeAttr('id');
    fsc.writeFile('build/page/static/index.html', $);
  });
}

if (fs.existsSync('build/crawler/static/index.html')) {
  fsc.readFile('build/crawler/static/index.html').then($ => {
    $('#babel').remove();
    $('#main').removeAttr('type');
    $('#main').removeAttr('id');
    fsc.writeFile('build/crawler/static/index.html', $);
  });
}