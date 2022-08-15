import tap from 'tap';
import * as utils from '../../../src/general/utils.js';

const IPv4 = /^((1?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(1?\d{1,2}|2[0-4]\d|25[0-5])$/;

tap.test('generateIps', async t => {
  let ips = utils.generateIps(3);
  t.equal(ips.length, 3);
  ips.forEach(val => {
    t.ok(IPv4.test(val));
  });  
});

tap.test('toAbsolute', async t => {
  t.equal(utils.toAbsolute('/page', 'http://test.com'), 'http://test.com/page');
  t.equal(utils.toAbsolute('/page', 'http://test.com/'), 'http://test.com/page');
  t.equal(utils.toAbsolute('/page', 'http://test.com/test'), 'http://test.com/page');
  t.equal(utils.toAbsolute('page', 'http://test.com/test'), 'http://test.com/page');
  t.equal(utils.toAbsolute('/page', 'http://test.com/subdir/test'), 'http://test.com/page');
  t.equal(utils.toAbsolute('/', 'http://test.com/subdir/test'), 'http://test.com/');
  t.equal(utils.toAbsolute('page', 'http://test.com/subdir/test'), 'http://test.com/subdir/page');
  t.equal(utils.toAbsolute('page', 'http://test.com'), 'http://test.com/page');
  t.equal(utils.toAbsolute('http://page.com', 'http://test.com/test'), 'http://page.com');
  t.equal(utils.toAbsolute('?q=page', 'http://test.com'), 'http://test.com/?q=page');
  t.equal(utils.toAbsolute('?q=page', 'http://test.com/test'), 'http://test.com/test?q=page');
  t.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=test'), 'http://test.com/test?q=page');
  t.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=test&q=test'), 'http://test.com/test?q=page');
  t.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=test&q=test#test'), 'http://test.com/test?q=page');
  t.equal(utils.toAbsolute('?q=page', 'http://test.com/test?q=page'), undefined);
  t.equal(utils.toAbsolute('#bookmark', 'http://test.com/test'), undefined);
  t.equal(utils.toAbsolute('', 'http://test.com/test'), undefined);
});

tap.test('parseTimeString', async t => {
  t.equal(utils.parseTimeString('1ms'), 1);
  t.equal(utils.parseTimeString('1s'), 1000);
  t.equal(utils.parseTimeString('1m'), 60 * 1000);
  t.equal(utils.parseTimeString('1h'), 60 * 60 * 1000);
  t.equal(utils.parseTimeString('1d'), 24 * 60 * 60 * 1000);
  t.equal(utils.parseTimeString('0ms'), 0);
  t.equal(utils.parseTimeString('0s'), 0);
  t.equal(utils.parseTimeString('1m30s'), undefined);
  t.equal(utils.parseTimeString('s'), undefined);
  t.equal(utils.parseTimeString('-1'), undefined);
});

tap.test('parseTime', async t => {
  t.equal(utils.parseTime('1ms'), 1);
  t.equal(utils.parseTime(100), 100);
  t.equal(utils.parseTime({}), undefined);
  t.equal(utils.parseTime(() => {}), undefined);
  t.equal(utils.parseTime(undefined), undefined);
});

tap.test('ifDefined', async t => {
  t.equal(utils.ifDefined(val => val)(1), 1);

  t.equal(utils.ifDefined(val => val)(undefined), undefined);
  
  let valid = [1, true, '1', '', 0, null, {}, () => {}];
  t.same(valid.map(utils.ifDefined(val => val)), valid);
});

tap.test('calculatePerMinute', async t => {
  t.equal(utils.calculatePerMinute(100, 1).rate, 600);
  t.equal(utils.calculatePerMinute(100, 2).rate, 1200);
  t.equal(utils.calculatePerMinute(0, 1).rate, 6000);
  t.equal(utils.calculatePerMinute(1, 0).rate, 0);
  t.equal(utils.calculatePerMinute(0, 0).rate, 0);

  let update = utils.calculatePerMinute(100, 1).update;
  t.equal(update(100, 2).rate, 720); 
  t.equal(update(100, 2).rate, 720, 'calling same update twice should not change the rate');
  
  update = update(100, 2).update;
  t.equal(update(100, 2).rate, 816);

  update = utils.calculatePerMinute(1, 0).update;
  t.equal(update(100, 1).rate, 600, 'update should overwrite zero'); 
});
