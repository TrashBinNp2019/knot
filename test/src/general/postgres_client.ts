import * as tap from 'tap';
import esmock from 'esmock';
const client = await esmock(
  '../../../src/general/postgres_client.ts',
  {
    // 'pg': {
    //   Pool: (config:any) => {
    //     return {
    //       connect: async () => {
    //         return {
    //           query: async (query:string) => {
    //             return {
    //               rows: [{
    //                 id: 1,
    //                 name: 'test',
    //               }],
    //             };
    //           },
    //         };
    //       },
    //     };
    //   }
    // },
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
  }
);

tap.test('Test db access', async t => {

});

