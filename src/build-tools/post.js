import * as fs from 'fs';
import fsc from 'fs-cheerio';

if (fs.existsSync('build/page/static/index.jsx')) {
    fs.rmSync('build/page/static/index.jsx');
}
if (fs.existsSync('build/page/static/index.html')) {
    fsc.readFile('build/page/static/index.html').then($ => {
        $('#babel').remove();
        $('#react').removeAttr('type');
        $('#react').attr('src', 'index.js');
        $('#react').removeAttr('id');
        fsc.writeFile('build/page/static/index.html', $);
    });
}