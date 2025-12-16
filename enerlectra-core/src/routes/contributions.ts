import { Router } from 'express';
import { nanoid } from 'nanoid';
import { recordContribution } from '../services/ledger';
import fs from 'fs';
import path from 'path';

const router = Router();

const STORE_DIR = path.join(__dirname, '..', 'store');
const CONTRIBUTIONS_FILE = path.join(STORE_DIR, 'contributions.json');

function loadContributions() {
  if (!fs.existsSync(CONTRIBUTIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(CONTRIBUTIONS_FILE, 'utf8'));
}

// GET /clusters/:id/contributions
router.get('/clusters/:id/contributions', (req, res) => {
  const { id } = req.params;
  const all = loadContributions();
  const contributions = all.filter((c: any) => c.clusterId === id);
  res.json({ clusterId: id, contributions });
});

// POST /clusters/:id/join
router.post('/clusters/:id/join', (req, res) => {
  const { id } = req.params;
  const { userId, amountZMW } = req.body;

  if (!userId || typeof amountZMW !== 'number' || amountZMW <= 0) {
    return res.status(400).json({ error: 'Invalid contribution' });
  }

  const entry = {
    contributionId: `ctr_${nanoid(8)}`,
    clusterId: id,
    userId,
    amountZMW,
    timestamp: new Date().toISOString()
  };

  recordContribution(entry);

  res.json({ ok: true, ...entry });
});

export default router;
