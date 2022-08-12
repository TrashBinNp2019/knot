import pg from 'pg';
import * as fs from 'fs';
import { Host } from './abstract_client.js';
import { postgresConfig as config } from './config/config_singleton.js';
import * as prep from './prep-string.js'
const { Pool } = pg;

const pool = new Pool(config);

export async function test() {
  try {
    await pool.query('SELECT title, addr, contents, keywords FROM hosts');
    return undefined;
  } catch (err) {
    if (err.code === '42P01') {
      try {
        await pool.query(`CREATE TABLE hosts (
          title VARCHAR(128) NOT NULL,
          addr VARCHAR(128) NOT NULL,
          contents TEXT NOT NULL,
          keywords VARCHAR(256) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        return undefined;
      } catch(e) {
        return e;
      }
    } else {
      return err;
    }
  }
}
  
  export function push(host:Host) {
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
        '${host.keywords}'
      )`, 
      (err, res) => 
      {
        if (err) throw err;
      });
    }
    
    export async function get() {
      return (await pool.query('SELECT title, addr FROM hosts')).rows;
    }
    
    export async function search(q:string) {
      let query = `SELECT title, addr, contents, keywords FROM hosts WHERE title iLIKE $1 OR contents LIKE $1`;
      return (
        await pool.query(query, ['% ' + prep.forSql(q) + ' %'])
      ).rows;
    }