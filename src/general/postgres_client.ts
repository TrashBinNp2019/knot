import pg from 'pg';
import { Host, Image } from './abstract_client.js';
import { postgresConfig as config } from './config/config_singleton.js';
import * as prep from './prep-string.js';
const { Pool } = pg;

const pool = new Pool(config().writeExcluded());

export async function test() {
  try {
    await pool.query('SELECT title, addr, contents, keywords FROM hosts');
  } catch (err) {
    if (err.code === '42P01') {
      createHostTable();
    } else {
      err.message = '(hosts) ' + err.message;
      return err;
    }
  }

  try {
    await pool.query('SELECT addr, src, dsc FROM images');
  } catch (err) {
    if (err.code === '42P01') {
      createImageTable();
    } else {
      err.message = '(images) ' + err.message;
      return err;
    }
  }

  return undefined;
}

export function push(host: Host) {
  host.title = prep.forSql(host.title).substring(0, 128);
  host.addr = prep.forSql(host.addr).substring(0, 128);
  host.contents = prep.forSql(host.contents);
  if (host.contents.length > 65534) {
    host.contents = host.contents.substring(0, 65534);
  }
  host.keywords = prep.forSql(host.keywords).substring(0, 256);
  
  pool.query(
    `INSERT INTO hosts (title, addr, contents, keywords) VALUES (
      '${host.title}', 
      '${host.addr}', 
      '${host.contents}', 
      '${host.keywords}')`, 
  );
}

export function pushImg(img: Image) {
  img.addr = prep.forSql(img.addr).substring(0, 128);
  img.src = prep.forSql(img.src).substring(0, 128);
  img.dsc = prep.forSql(img.dsc).substring(0, 128);
  
  pool.query(
    `INSERT INTO images (addr, src, dsc) VALUES (
      '${img.addr}', 
      '${img.src}', 
      '${img.dsc}')`, 
  );
};
    
export async function get() {
  return (await pool.query('SELECT title, addr FROM hosts')).rows;
}
    
export async function search(q: string) {
  let query = `SELECT title, addr, contents, keywords FROM hosts WHERE title iLIKE $1 OR contents iLIKE $1`;
  return (await pool.query(query, ['% ' + prep.forSql(q) + ' %'])).rows;
}
    
async function createHostTable() {
  try {
    await pool.query(`CREATE TABLE hosts (
      title VARCHAR(128) NOT NULL,
      addr VARCHAR(128) NOT NULL,
      contents TEXT NOT NULL,
      keywords VARCHAR(256) NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await pool.query(`CREATE INDEX host_addr ON hosts (addr)`);
    return undefined;
  } catch (err) {
    return err;
  }
}
    
async function createImageTable() {
  try {
    await pool.query(`CREATE TABLE images (
      src VARCHAR(256) NOT NULL,
      dsc VARCHAR(128) NOT NULL,
      addr VARCHAR(128) NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await pool.query(`CREATE INDEX img_src ON images (src)`);
    return undefined;
  } catch (err) {
    return err;
  }
}
