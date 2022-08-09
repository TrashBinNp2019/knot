import * as fs from 'fs';
import fsc from 'fs-cheerio';

const label = 'Post-build succesful';
console.time(label);

if (fs.existsSync('build/page/static/index.html')) {
  fsc.readFile('build/page/static/index.html').then($ => {
    $('#babel').remove();
    $('#react').removeAttr('type');
    $('#react').attr('src', 'index.js');
    $('#react').removeAttr('id');
    $('#prep-string').removeAttr('type');
    $('#prep-string').removeAttr('id');
    $('#exports').remove();
    fsc.writeFile('build/page/static/index.html', $);
  });
} else {
  console.log('Post-build error: build/page/static/index.html not found!');
  process.exit(1);
}

if (fs.existsSync('build/crawler/static/index.html')) {
  fsc.readFile('build/crawler/static/index.html').then($ => {
    $('#babel').remove();
    $('#main').removeAttr('type');
    $('#main').removeAttr('id');
    $('#prep-string').removeAttr('type');
    $('#prep-string').removeAttr('id');
    $('#exports').remove();
    fsc.writeFile('build/crawler/static/index.html', $);
  });
} else {
  console.log('Post-build error: build/crawler/static/index.html not found!');
  process.exit(1);
}

if (fs.existsSync('build/general/public/prep-string.js')) {
  let file = fs.readFileSync('build/general/public/prep-string.js');
  file = file.toString().replace(/^export /gm, '');
  fs.writeFileSync('build/general/public/prep-string.js', file);
} else {
  console.log('Post-build error: build/general/public/prep-string.js not found!');
  process.exit(1);
}

console.timeEnd(label);