import * as types from './config_types.js';

let crawler_config: types.CrawlerConfig;
let page_config: types.PageConfig;
let postgres_config: types.PostgresConfig;

export function crawlerConfig() {
  if (!crawler_config) {
    crawler_config = types.CrawlerConfig.read();
  }
  return crawler_config; 
}

export function pageConfig() {
  if (!page_config) {
    page_config = types.PageConfig.read();
  }
  return page_config;
}

export function postgresConfig() {
  if (!postgres_config) {
    postgres_config = types.PostgresConfig.read();
  }
  return postgres_config;
}
