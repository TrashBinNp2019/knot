import { Router } from 'express';
import * as db from '../../general/postgres_client.js';
export const api = Router();

api.get('/pages/count', async (req, res) => {
  const count = await db.count();
  res.json({ count });
});

api.get('/images/count', async (req, res) => {
  const count = await db.countImg();
  res.json({ count });
});

api.get('/pages/search', async (req, res) => {
  res.json({ 
    count: await db.countSearch(String(req.query.q)),
    // FIXME handle error
    rows: await db.search(String(req.query.q), Number(req.query.p)),
  });
});

api.get('/images/search', async (req, res) => {
  res.json({
    count: await db.countSearchImg(String(req.query.q)),
    rows: await db.searchImg(String(req.query.q), Number(req.query.p))
  });
});
