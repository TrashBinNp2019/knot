import { assert } from 'chai';
import * as fs from 'fs';

/**
 * readDirSync but recursive (maybe dumb but whatever)
 * @param dir Directory to read
 * @returns File names in the directory, including subdirectories
 */
const readDirSync = (dir: string) => {
  // TODO redo as async
  let output: string[] = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(file => {
    if (file.isFile()) {
      output.push(file.name);
    } else if (file.isDirectory()) {
      output = output.concat(readDirSync(dir + '/' + file.name).map(f => file.name + '/' + f));
    }
  });
  return output;
};

// TODO compress stuff and test it

suite('Crawler', () => {
  test('Files should be intact', () => {
    let expected = readDirSync('src/crawler');
    expected = expected.map(file => file.replace(/.ts$/, '.js'));
    let actual = readDirSync('build/crawler');
    assert.deepEqual(actual.sort(), expected.sort());
  });

});

suite('Page', () => {
  test('Files should be intact', () => {
    let expected = readDirSync('src/page');
    expected = expected.map(file => file.replace(/.ts$|.jsx$/, '.js'));
    let actual = readDirSync('build/page');
    assert.deepEqual(actual.sort(), expected.sort());
  });
});

suite('General', () => {
  test('Files should be intact', () => {
    let expected = readDirSync('src/general');
    expected = expected.map(file => file.replace(/.ts$/, '.js'));
    expected.push('public/prep-string.js');
    let actual = readDirSync('build/general');
    assert.deepEqual(actual.sort(), expected.sort());
  });
});