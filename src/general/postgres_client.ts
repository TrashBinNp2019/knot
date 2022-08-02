import pg from 'pg';
import * as fs from 'fs';
const { Pool } = pg;

const config = JSON.parse(fs.readFileSync('./config/postgres-config.json', 'utf8'));
const pool = new Pool({
    user: config.user ?? 'knot',
    host: config.host ?? 'localhost',
    database: config.database ?? 'knot',
    password: config.password ?? 'knot',
    port: config.port ?? 5432,
});

export class Host {
    title: string;
    addr: string;
    contents: string;

    constructor(title: string, addr: string, contents: string) {
        this.title = title;
        this.addr = addr;
        this.contents = contents;
    }
}

export async function test() {
    try {
        await pool.query('SELECT title, addr, contents FROM hosts');
        return undefined;
    } catch (err) {
        if (err.code === '42P01') {
            try {
                await pool.query(`CREATE TABLE hosts (
                    title VARCHAR(120) NOT NULL,
                    addr VARCHAR(120) NOT NULL,
                    contents VARCHAR(5000) NOT NULL
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
    pool.query(
        `INSERT INTO hosts (title, addr, contents) VALUES ('${host.title}', '${host.addr}', '${host.contents}')`, 
        (err, res) => 
    {
        if (err) throw err;
    });
}

export async function get() {
    return (await pool.query('SELECT title, addr, contents FROM hosts')).rows;
}

export async function search(query:string) {
    return (await pool.query(`SELECT title, addr, contents FROM hosts WHERE title LIKE '%${query}%' OR contents LIKE '%${query}%'`)).rows;
}