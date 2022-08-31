import * as tap from 'tap';
import esmock from 'esmock';
const client = await esmock(
  '../../../src/general/postgres_client.ts',
  {
    'pg': {
      Pool: class {
        query: (query: string, args?: string[]) => { 
          rows: any[]; 
          rowCount: number;
        };

        constructor(config: any) {
          this.query = (query: string, args?: string[]) => {
            if (errs.length > 0) {
              if (errs[errs.length - 1]) {
                throw errs.pop();
              } else {
                errs.pop();
              }
            }

            let n = 1;
            args?.forEach(arg => {
              arg = arg.slice(2, -2);
              query = query.replace(`$${n}`, arg);
              n++;
            })
            queries.push(query);
            return { 
              rows: response,
              rowCount: response.length,
            }
          };
        }
      }
    },
    '../../../src/general/config/config_singleton.ts': {
      postgresConfig: () => ({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
        writeExcluded: () => {
          return this;
        }
      }),
    }
  },
);

let response: any[] = [];
let queries: string[] = [];
let errs: ({} | null)[] = [];

tap.beforeEach(async () => {
  queries = [];
  errs = [];
});

tap.test('Test db access', async t => {
  await client.test();
  t.match(queries.length, 2);

  queries = [];
  errs.push({ code: '42P01' });
  await client.test();
  t.match(queries.length, 3);
  t.match(queries[queries.length - 3], /^CREATE TABLE hosts/);
  t.match(queries[queries.length - 2], /^CREATE INDEX .*? ON hosts/);
  t.equal(errs.length, 0);

  queries = [];
  errs.push({ code: '42P01' });
  errs.push(null);
  await client.test();
  t.match(queries.length, 3);
  t.match(queries[queries.length - 2], /^CREATE TABLE images/);
  t.match(queries[queries.length - 1], /^CREATE INDEX .*? ON images/);
  t.equal(errs.length, 0);

  errs.push({ message: 'BAD' });
  t.same(await client.test(), { message: '(hosts) BAD' });
  t.equal(errs.length, 0);

  errs.push({ message: 'BAD' });
  errs.push({ code: '42P01' });
  t.same(await client.test(), { message: 'BAD' });
  t.equal(errs.length, 0);

  errs.push({ message: 'BAD' });
  errs.push(null);
  t.same(await client.test(), { message: '(images) BAD' });
  t.equal(errs.length, 0);

  errs.push({ message: 'BAD' });
  errs.push({ code: '42P01' });
  errs.push(null);
  t.same(await client.test(), { message: 'BAD' });
  t.equal(errs.length, 0);
});

tap.test('Get all', async t => {
  response = [{}, {}, {}, {}];
  t.equal((await client.get()).length, 4);
  t.match(queries[queries.length - 1], /^SELECT .*? FROM hosts$/);
});

tap.test('Search', async t => {
  response = [{}, {}, {}, {}];
  t.equal((await client.search('test')).length, 4);
  t.match(queries[queries.length - 1], /^SELECT .*? FROM hosts WHERE .*? iLIKE test/);
});

tap.test('Search images', async t => {
  response = [{}, {}, {}, {}];
  t.equal((await client.searchImg('test')).length, 4);
  t.match(queries[queries.length - 1], /^SELECT .*? FROM images WHERE .*? iLIKE test/);
});

tap.test('Push', async t => {
  client.push({
    title: 'test',
    addr: 'test',
    contents: 'test',
    keywords: 'test',
  });
  t.match(queries[queries.length - 1], /^INSERT INTO hosts/);

  errs.push({ code: 'BAD' });
  t.throws(() => client.push({
    title: 'test',
    addr: 'test',
    contents: 'test',
    keywords: 'test',
  }));
  t.equal(errs.length, 0);

  client.push({
    title: '1'.repeat(128 + 1),
    addr: '1'.repeat(128 + 2),
    contents: '1'.repeat(65534 + 1),
    keywords: '1'.repeat(256 + 2),
  });
  t.equal(queries[queries.length - 1].match(/1/g)?.length, 128 + 128 + 65534 + 256, 'should trim input');
});

tap.test('Push image', async t => {
  client.pushImg({
    src: 'test',
    dsc: 'test',
    addr: 'test',
  });
  t.match(queries[queries.length - 1], /^INSERT INTO images/);

  errs.push({ code: 'BAD' });
  t.throws(() => client.pushImg({
    src: 'test',
    dsc: 'test',
    addr: 'test',
  }));
  t.equal(errs.length, 0);

  client.pushImg({
    src: '1'.repeat(128 + 1),
    dsc: '1'.repeat(128 + 2),
    addr: '1'.repeat(128 + 2),
  });
  t.equal(queries[queries.length - 1].match(/1/g)?.length, 128 + 128 + 128, 'should trim input');
});

tap.test('Count', async t => {
  response = [{ count: 10 }];
  t.equal(await client.count(), 10);
  t.match(queries[queries.length - 1], /^SELECT COUNT\(.*?\) FROM hosts$/);
});

tap.test('Count images', async t => {
  response = [{ count: 10 }];
  t.equal(await client.countImg(), 10);
  t.match(queries[queries.length - 1], /^SELECT COUNT\(.*?\) FROM images$/);
});

tap.test('Count-search', async t => {
  response = [{count: 4}];
  t.equal(await client.countSearch('test'), 4);
  t.match(queries[queries.length - 1], /^SELECT COUNT\(\*\) FROM hosts WHERE .*? iLIKE test/);
});

tap.test('Count-search images', async t => {
  response = [{count: 4}];
  t.equal(await client.countSearchImg('test'), 4);
  t.match(queries[queries.length - 1], /^SELECT COUNT\(\*\) FROM images WHERE .*? iLIKE test/);
});

