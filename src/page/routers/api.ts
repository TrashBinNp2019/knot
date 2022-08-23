import { Router } from 'express';
import * as db from '../../general/postgres_client.js';
export const api = Router();

api.get('/search', async (req, res) => {
  res.send(JSON.stringify(await db.search(String(req.query.q))));
});
