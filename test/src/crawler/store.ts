import * as tap from 'tap';
import { store } from '../../../src/crawler/state/store.js';
import * as pausable from '../../../src/crawler/state/pausableSlice.js';
import * as general from '../../../src/crawler/state/generalStatsSlice.js';

tap.test('general/log', t => {
  let unsub = store.subscribe(() => {
    t.match(store.getState().general.message, /166\d{10};test/);
    unsub();
    t.end();
  });

  store.dispatch(general.log(['test']));
});

tap.test('general/valid', t => {
  let unsub = store.subscribe(() => {
    t.equal(store.getState().general.valid_total, 17);
    unsub();
    t.end();
  });

  store.dispatch(general.valid({ count: 17 }));
});

tap.test('general/valid rep', t => {
  let unsub = store.subscribe(() => {
    t.equal(store.getState().general.valid_total, 32);
    unsub();
    t.end();
  });

  store.dispatch(general.valid({ count: 15 }));
});

tap.test('general/examined', t => {
  let unsub = store.subscribe(() => {
    let after = Date.now()
    t.equal(store.getState().general.examined_total, 17);
    t.ok(store.getState().general.examined_prev > after - 200);
    t.ok(store.getState().general.examined_prev < after + 200);
    let expected = 60000 * 17 / ((after - before) || 1);
    // can fail if execution is too slow
    t.ok(store.getState().general.examined_pm < (expected * 5));
    t.ok(store.getState().general.examined_pm > (expected * 0.2));
    
    t.not(store.getState().general.examined_pm, 0);
    unsub();
    t.end();
  });

  let before = Date.now();
  store.dispatch(general.examined({ count: 17 }));
});

tap.test('general/examined rep', t => {
  let unsub = store.subscribe(() => {
    t.equal(store.getState().general.examined_total, 32);
    t.ok(store.getState().general.examined_prev > Date.now() - 200);
    t.ok(store.getState().general.examined_prev < Date.now() + 200);
    t.not(store.getState().general.examined_pm, 0);
    unsub();
    t.end();
  });

  store.dispatch(general.examined({ count: 15 }));
});

tap.test('general/resetTime', t => {
  let prev = store.getState().general.examined_prev;
  let unsub = store.subscribe(() => {
    t.ok(store.getState().general.examined_prev > prev);
    unsub();
    t.end();
  });

  store.dispatch(general.resetTime({}));
});

tap.test('pausable', async t => {
  store.dispatch(pausable.pauseRequested({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: false,
    pausePending: true,
    resumePending: false,
  });

  store.dispatch(pausable.resumeRequested({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: false,
    pausePending: false,
    resumePending: false,
  });

  store.dispatch(pausable.pauseRequested({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: false,
    pausePending: true,
    resumePending: false,
  });

  store.dispatch(pausable.resumed({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: false,
    pausePending: true,
    resumePending: false,
  });

  store.dispatch(pausable.paused({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: true,
    pausePending: false,
    resumePending: false,
  });

  store.dispatch(pausable.resumeRequested({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: true,
    pausePending: false,
    resumePending: true,
  });

  store.dispatch(pausable.pauseRequested({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: true,
    pausePending: false,
    resumePending: false,
  });

  store.dispatch(pausable.resumeRequested({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: true,
    pausePending: false,
    resumePending: true,
  });

  store.dispatch(pausable.paused({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: true,
    pausePending: false,
    resumePending: true,
  });

  store.dispatch(pausable.resumed({}));
  await new Promise(resolve => setTimeout(resolve, 50));
  t.match(store.getState().pausable, {
    paused: false,
    pausePending: false,
    resumePending: false,
  });
});
