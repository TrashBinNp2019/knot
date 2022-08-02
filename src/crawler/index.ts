import { AxiosResponse, default as axios } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as db from '../general/postgres_client.js';

// read config
const config = JSON.parse(fs.readFileSync('./config/crawler-config.json', 'utf8'));
let timeout = 3000;
ifDefined(config.request_timeout, val => {
    if (typeof(config.request_timeout) === 'number') {
        if (timeout >= 100) {
            timeout = config.request_timeout;
            return;
        } else {
            timeout = config.request_timeout * 1000;
            return;
        }
    } 

    if (typeof(config.request_timeout) === 'string') {
        if (/^\d+ms$/.test(config.request_timeout)) {
            timeout = parseInt(config.request_timeout.substring(0, config.request_timeout.length - 2));       
            return;
        } 
        if (/^\d+s$/.test(config.request_timeout)) {
            timeout = parseInt(config.request_timeout.substring(0, config.request_timeout.length - 1)) * 1000;       
            return;
        }
    }

    console.log('invalid request_timeout');
});
const TIMEOUT = timeout ?? 3000;
const TARGETS_CAP = config.targets_cap ?? 5000;
let targets:string[] = [];


db.test().then((err) => {
    if (err) {
        console.log('- DB error:', err.message);
        process.exit(1);
    }

    crawl(targets, -1).then(() => {
        console.log('results:');
    }).catch(err => {
        console.log(err);
    });
})


/**
 * If arg is defined, call the callback with arg.
 * @param arg Value to check
 * @param callback If defined called with arg
 */
function ifDefined<T>(arg:T | undefined, callback: (arg:T) => void) {
    if (arg !== undefined) {
        callback(arg);
    }
}

/**
 * Generate a random IP address without any validity checks.
 * @returns IP address
 */
function generateIp():string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/**
 * Recursively crawl given targets and any discovered ones.
 * @param targets Array of targets to crawl
 * @param depth Number of recusive calls to perform. -1 for unlimited
 */
async function crawl(targets:string[], depth:number = -1) {
    let new_targets:string[] = [];
    try {
        targets = targets.map(target => {
            if (!target.startsWith('http')) {
                return `http://${target}`;
            }   return target;
        });
        let promises = targets.map(async (target) => {
            try {
                let response = await axios.get(target, { timeout: TIMEOUT });
                return { res: response, target: target };
            }
            catch (e:any) {
                if (e.code !== 'ECONNABORTED' && 
                    e.code !== 'EADDRNOTAVAIL' && 
                    e.code !== 'ENETUNREACH' &&
                    e.code !== 'EHOSTUNREACH' && 
                    e.code !== 'ECONNREFUSED') 
                {
                    console.log('-', target, ' Unusual error:', e.code);
                }
                return;
            }
        });        

        (await Promise.all(promises)).forEach((p:{ res:AxiosResponse, target:string } | undefined) => {
            ifDefined(p, (pair) => {
                const source = pair.target;
                const res = pair.res;
                inspect(res, source, new_targets); 
            });
        })
    } catch (e:any) {
        console.log(e.code ?? e.message);
    }
    if (depth === -1 || depth > 1) {
        if (new_targets.length !== 0) {
            console.log(`- Detected ${new_targets.length} new targets`);
        }
        if (new_targets.length < TARGETS_CAP) {
            // console.log(`generating ${TARGETS_CAP - new_targets.length} new targets`);
            new_targets = [...new_targets, ...Array(TARGETS_CAP - new_targets.length).fill(0).map(() => generateIp())];
        } else {
            console.log('- Too many targets detected, dropping');
            new_targets = Array(TARGETS_CAP).fill(0).map(() => generateIp());
        }
        await crawl(new_targets, depth === -1? -1 : depth - 1);
    }
}

/**
 * Inspect the response and extract the title and futher possible targets
 * @param res AxiosResponse to inspect
 * @param source Response source
 * @param targets Array to append any discovered targets to
 */
function inspect(res: AxiosResponse<any, any>, source: string, targets: string[] ) {
    const $ = cheerio.load(res.data);

    // Initiate fields
    let title = $('title').text();
    let contents = '';
    
    // Check source
    if (source.length > 120) {
        console.log('- Source too long!');
        return;
    }

    // Search for title and format it
    let index = 1;
    while (!title && index <= 6) {
        title = $(`h${index}`).text();
        index++;
    }
    if (!title) {
        title = source;
        if (title === undefined) {
            title = 'unknown';
        }
    }
    if (title.split(' ').length > 5) {
        title = title.split(' ').slice(0, 5).join(' ') + '...';
    } else if (title.length > 100) {
        title = title.substring(0, 100) + '...';
    }
    title = title.replace(/[\n'"`]+/gi, ' ');
    title = title.replace(/\s+/g, ' ');

    // Search for contents and format them
    for (let i = 1; i <= 6; i++) {
        contents += $(`h${i}`).text() + ' ';
    }
    contents += $('p').text();
    contents = contents.replace(/[\n'"`]+/gi, ' ');
    contents = contents.replace(/\s+/g, ' ');
    contents = contents.substring(0, 5000);
    contents = contents.substring(0, contents.lastIndexOf(' '));

    // Search for links
    $('[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        ifDefined(href, val => {
            val = val.substring(val.indexOf('?') ?? val.length);
            val = val.substring(val.indexOf('#') ?? val.length);
            if (val.startsWith('http') && targets.indexOf(val) === -1) {
                targets.push(val);
            }
        });
    });

    console.log('-', { title: title, addr: source, contents_length: contents.length });
    db.push({ title: title, addr: source, contents: contents});
}

