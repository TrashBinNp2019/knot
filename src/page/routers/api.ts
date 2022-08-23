import { Router } from 'express';
import * as db from '../../general/postgres_client.js';
export const api = Router();

api.get('/pages/search', async (req, res) => {
  res.send(JSON.stringify(await db.search(String(req.query.q))));
});

api.get('/images/search', async (req, res) => {
  res.send(JSON.stringify(await db.searchImg(String(req.query.q))));
});
