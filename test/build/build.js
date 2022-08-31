import * as fs from 'fs';
import * as tap from 'tap';

/**
 * readDirSync but recursive (maybe dumb but whatever)
 * @param dir Directory to read
 * @returns File names in the directory, including subdirectories
 */
const readDirSync = (dir) => {
  let output = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(file => {
    if (file.isFile()) {
      output.push(file.name);
    } else if (file.isDirectory()) {
      output = output.concat(readDirSync(dir + '/' + file.name).map(f => file.name + '/' + f));
    }
  });
  return output;
};

tap.test('crawler dir should be intact', async t => {
  let expected = readDirSync('src/crawler');
  expected = expected.map(file => file.replace(/.ts$/, '.js'));
  let actual = readDirSync('build/crawler');
  t.same(actual.sort(), expected.sort());
});

tap.test('general dir should be intact', async t => {
  let expected = readDirSync('src/page');
  expected = expected.map(file => file.replace(/.ts$|.jsx$/, '.js'));
  let actual = readDirSync('build/page');
  t.same(actual.sort(), expected.sort());
});

tap.test('page dir should be intact', async t => {
  let expected = readDirSync('src/general');
  expected = expected.map(file => file.replace(/.ts$/, '.js'));
  expected.push('public/prep-string.js');
  let actual = readDirSync('build/general');
  t.same(actual.sort(), expected.sort());
});