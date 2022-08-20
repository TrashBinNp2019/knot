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
              throw errs.pop();
            }

            let n = 1;
            args?.forEach(arg => {
              arg = arg.slice(2, -2);
              query = query.replace(`$${n}`, arg);
              n++;
            })
            last_query = query;
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
let last_query: string = '';
let errs: { code: string }[] = [];

tap.test('Test db access', async t => {
  errs = [];
  await client.test();
  t.match(last_query, /^SELECT .*? FROM hosts$/);

  errs.push({ code: '42P01' });
  await client.test();
  t.match(last_query, /^CREATE TABLE hosts/);
  t.equal(errs.length, 0);

  errs.push({ code: 'BAD' });
  errs.push({ code: '42P01' });
  t.same(await client.test(), { code: 'BAD' });
  t.equal(errs.length, 0);

  errs.push({ code: 'BAD' });
  t.same(await client.test(), { code: 'BAD' });
  t.equal(errs.length, 0);
});

tap.test('Get all', async t => {
  response = [{}, {}, {}, {}];
  t.equal((await client.get()).length, 4);
  t.match(last_query, /^SELECT .*? FROM hosts$/);
});

tap.test('Search', async t => {
  response = [{}, {}, {}, {}];
  t.equal((await client.search('test')).length, 4);
  t.match(last_query, /^SELECT .*? FROM hosts WHERE .*? iLIKE test/);
});

tap.test('Push', async t => {
  client.push({
    title: 'test',
    addr: 'test',
    contents: 'test',
    keywords: 'test',
  });
  t.match(last_query, /^INSERT INTO hosts/);

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
  t.equal(last_query.match(/1/g)?.length, 128 + 128 + 65534 + 256, 'should trim input');
});
