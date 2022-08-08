import pg from 'pg';
import * as fs from 'fs';
import { Host } from './abstract_client.js';
const { Pool } = pg;

const config = JSON.parse(fs.readFileSync('./config/postgres-config.json', 'utf8'));
if (config.password === undefined) {
  console.log('- Postgres password not found in postgres-config.json');
  process.exit(1);
}
const pool = new Pool({
  user: config.user ?? 'knot',
  host: config.host ?? 'localhost',
  database: config.database ?? 'knot',
  password: config.password,
  port: config.port ?? 5432,
});

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
    host.title = host.title.replace(/'/g, '').substring(0, 128);
    host.addr = host.addr.replace(/'/g, '').substring(0, 128);
    host.contents = host.contents.replace(/'/g, '');
    if (host.contents.length > 65534) {
      host.contents = host.contents.substring(0, 65534);
    }
    host.keywords = host.keywords.replace(/'/g, '').substring(0, 255);

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
    
    export async function search(query:string) {
      query = query.replace(/'/g, '');
      return (await pool.query(`SELECT title, addr, contents, keywords FROM hosts WHERE title iLIKE '%${query}%' OR contents LIKE '%${query}%'`)).rows;
    }