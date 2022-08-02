import express from 'express';
import bodyParser from 'body-parser';
import * as db from '../general/postgres_client.js';
import * as fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config/page-config.json', 'utf8'));
const app = express();
const port = config.port ?? 3000;

app.use(express.static('src/page/static'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/search', async (req, res) => {
    res.send(JSON.stringify(await db.search(String(req.query.q))));
});

db.test().then(err => {
    if (err) {
        console.log(err);
        process.exit();
    }

    app.listen(port);
    console.log(`Server started on port ${port}`);
});