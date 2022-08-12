import * as types from './config_types.js';

export let crawlerConfig = types.CrawlerConfig.read();
export let pageConfig = types.PageConfig.read();
export let postgresConfig = types.PostgresConfig.read();