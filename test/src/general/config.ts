import * as tap from 'tap';
import esmock from 'esmock';
const singles = await esmock(
  '../../../src/general/config/config_singleton.ts',
  {
    '../../../src/general/config/config_types.ts': {
      CrawlerConfig: {
        read: () => {
          crawlerRead++;
          return {
            crawler_config: 'crawler_config'
          };
        }
      },
      PageConfig: {
        read: () => {
          pageRead++;
          return {
            page_config: 'page_config'
          };
        }
      },
      PostgresConfig: {
        read: () => {
          postgresRead++;
          return {
            postgres_config: 'postgres_config'
          };
        }
      },
    }
  }
);
const types = await esmock(
  '../../../src/general/config/config_types.ts',
  {
    'fs': {
      readFileSync: (path:string) => {
        switch (path) {
          case 'config/crawler-config.json':
            return str ?? JSON.stringify(crawler);
          case 'config/page-config.json':
            return JSON.stringify(page);
          case 'config/postgres-config.json':
            return JSON.stringify(postgres);
          default:
            throw new Error(`unexpected path: ${path}`);
        }
      },
      writeFileSync: (path:string, data:string) => {
        switch (path) {
          case 'config/crawler-config.json':
            crawler = JSON.parse(data);
            break;
          case 'config/page-config.json':
            page = JSON.parse(data);
            break;
          case 'config/postgres-config.json':
            postgres = JSON.parse(data);
            break;
          default:
            throw new Error(`unexpected path: ${path}`);
        }
      },
      existsSync: () => exists,
    }
  }
);

// for types
let str: string | undefined = undefined;
let exists = true;
let path = 'config/crawler-config.json';
let crawler:any = {};
let page:any = {};
let postgres:any = {};

// for singleton
let crawlerRead = 0;
let pageRead = 0;
let postgresRead = 0;

tap.test('Readable', async t => {
  str = '{';
  exists = true;
  crawler = { test: 'test' };
  t.same(types.Readable.read(path), {});
  
  str = undefined;
  exists = false;
  crawler = { test: 'test' };
  t.same(types.Readable.read(path), {});
  t.same(crawler, {});
  
  exists = true;
  crawler = { test: 'test' };
  t.same(types.Readable.read(path), {"test":"test"});
  t.same(crawler, { test: 'test' });
});

tap.test('Cralwer', async t => {
  let c = new types.CrawlerConfig({
    request_timeout: 'invalid',
  });
  t.same(c, {
    request_timeout: 5000,
    targets_cap: 1000,
    use_web_interface: false,
    web_interface_port: 8081,
    unsafe: false,
    log_to_console: false,
    generate_random_targets: true,
  });

  c = new types.CrawlerConfig({});
  t.same(c, {
    request_timeout: 5000,
    targets_cap: 1000,
    use_web_interface: false,
    web_interface_port: 8081,
    unsafe: false,
    log_to_console: false,
    generate_random_targets: true,
  });

  c = new types.CrawlerConfig({
    request_timeout: '1s',
    targets_cap: 15,
    use_web_interface: false,
    web_interface_port: 8030,
    unsafe: true,
    generate_random_targets: false,
  });
  t.same(c, {
    request_timeout: 1000,
    targets_cap: 15,
    use_web_interface: false,
    web_interface_port: 8030,
    unsafe: true,
    log_to_console: false,
    generate_random_targets: false,
  });

  crawler = {};
  c = types.CrawlerConfig.read();
  t.same(c, {
    request_timeout: 5000,
    targets_cap: 1000,
    use_web_interface: false,
    web_interface_port: 8081,
    unsafe: false,
    log_to_console: false,
    generate_random_targets: true,
  });

  crawler = {
    request_timeout: 2000,
    targets_cap: 15,
    use_web_interface: false,
    web_interface_port: 8030,
    unsafe: true,
    generate_random_targets: false,
  };
  c = types.CrawlerConfig.read();
  t.same(c, {
    request_timeout: 2000,
    targets_cap: 15,
    use_web_interface: false,
    web_interface_port: 8030,
    unsafe: true,
    log_to_console: false,
    generate_random_targets: false,
  });

  c.request_timeout = 50000;
  c.write();
  t.same(crawler, {
    request_timeout: 50000,
    targets_cap: 15,
    use_web_interface: false,
    web_interface_port: 8030,
    unsafe: true,
    log_to_console: false,
    generate_random_targets: false,
  });
});

tap.test('Page', async t => {
  let p = new types.PageConfig({});
  t.same(p, { port: 8080 });

  p = new types.PageConfig({ port: 42975 });
  t.same(p, { port: 42975 });
  
  page = {};
  p = types.PageConfig.read();
  t.same(p, { port: 8080 });

  page = { port: 42975 };
  p = types.PageConfig.read();
  t.same(p, { port: 42975 });

  p.port = 123;
  p.write();
  t.same(page, { port: 123 });
});

tap.test('Postgres', async t => {
  let p = new types.PostgresConfig({
    user: 'user',
    password: 'password',
    database: 'database',
  });
  t.same(p, {
    user: 'user',
    password: 'password',
    database: 'database',
    host: 'localhost',
    port: 5432,
  });

  p = new types.PostgresConfig({
    user: 'user',
    password: 'password',
    database: 'database',
    host: 'host',
    port: 123,
  });
  t.same(p, {
    user: 'user',
    password: 'password',
    database: 'database',
    host: 'host',
    port: 123,
  });

  postgres = {
    user: 'user',
    password: 'password',
    database: 'database',
  };
  p = types.PostgresConfig.read();
  t.same(p, {
    user: 'user',
    password: 'password',
    database: 'database',
    host: 'localhost',
    port: 5432,
  });

  postgres = {
    user: 'user',
    password: 'password',
    database: 'database',
    host: 'host',
    port: 123,
  };
  p = types.PostgresConfig.read();
  t.same(p, {
    user: 'user',
    password: 'password',
    database: 'database',
    host: 'host',
    port: 123,
  });

  p.user = 'user2';
  p.write();
  t.same(postgres, {
    user: 'user2',
    password: 'password',
    database: 'database',
    host: 'host',
    port: 123,
  });
});

tap.test('Ensure valid', async t => {
  t.same(types.ensureValid('{"test": "test"}'), { test: 'test' });
  t.same(types.ensureValid('{'), {});
});

tap.test('Ensure exists', async t => {
  crawler = { test: 'test' };
  exists = true;
  types.ensureExists(path);
  t.equal(crawler.test, 'test');

  exists = false;
  types.ensureExists(path);
  t.same(crawler, {});
});

tap.test('All defined', async t => {
  t.ok(types.allDefined({
    user: 'user',
    password: 'password',
    database: 'database',
    port: 1000,
  }, ['user', 'password', 'database']));
  t.notOk(types.allDefined({
    user: 'user',
  }, ['user', 'invalid']));
});

tap.test('All strings', async t => {
  t.ok(types.allStrings({
    user: 'user',
    password: 'password',
    database: 'database',
    port: 1000,
  }, ['user', 'password', 'database']));
  t.notOk(types.allStrings({
    user: 'user',
  }, ['user', 'invalid']));
  t.notOk(types.allStrings({
    user: 'user',
    num: 1
  }, ['user', 'num']));
});

tap.test('Cralwer singleton', async t => {
  t.equal(crawlerRead, 0);

  t.same(singles.crawlerConfig(), {
    crawler_config: 'crawler_config',
  });
  t.equal(crawlerRead, 1, 'config should be read on first access');

  t.same(singles.crawlerConfig(), {
    crawler_config: 'crawler_config',
  });
  t.equal(crawlerRead, 1, 'config should not be read twice');

  let c = singles.crawlerConfig();
  c.crawler_config = 'crawler_config2';
  t.same(singles.crawlerConfig(), {
    crawler_config: 'crawler_config2',
  }, 'config should be writable');
});

tap.test('Page singleton', async t => {
  t.equal(pageRead, 0);

  t.same(singles.pageConfig(), {
    page_config: 'page_config',
  });
  t.equal(pageRead, 1, 'config should be read on first access');

  t.same(singles.pageConfig(), {
    page_config: 'page_config',
  });
  t.equal(pageRead, 1, 'config should not be read twice');

  let p = singles.pageConfig();
  p.page_config = 'page_config2';
  t.same(singles.pageConfig(), {
    page_config: 'page_config2',
  }, 'config should be writable');
});

tap.test('Postgres singleton', async t => {
  t.equal(postgresRead, 0);

  t.same(singles.postgresConfig(), {
    postgres_config: 'postgres_config',
  });
  t.equal(postgresRead, 1, 'config should be read on first access');

  t.same(singles.postgresConfig(), {
    postgres_config: 'postgres_config',
  });
  t.equal(postgresRead, 1, 'config should not be read twice');

  let p = singles.postgresConfig();
  p.postgres_config = 'postgres_config2';
  t.same(singles.postgresConfig(), {
    postgres_config: 'postgres_config2',
  }, 'config should be writable');
});
