import * as tap from 'tap';
import esmock from 'esmock';
const iface = await esmock(
  '../../../src/crawler/interface.ts',
  {
    '../../../src/general/config/config_singleton.ts': {
      crawlerConfig: () => ({
        web_interface_port: 41973,
      }),
    },
    '../../../src/crawler/state/store.ts': {
      store: {
        dispatchEvent: () => ({
          
        }),
        getState: () => ({
          pausable: {
            pausePending: false,
            paused: false,
            resumePending: false,
          },
        }),
      }
    },
  }
);

tap.test('Start express', async t => {
  let serv = iface.startExpress();
});
