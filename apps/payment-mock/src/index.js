const express = require('express');
const app = express();
app.use(express.json());

const seen = new Map();
const FAIL_RATE = parseFloat(process.env.FAIL_RATE || '0.15');

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.post('/capture', (req, res) => {
  const { preAuthId, amountCents, idempotencyKey } = req.body || {};
  if (!idempotencyKey || !preAuthId || typeof amountCents !== 'number') {
    return res.status(400).json({ error: 'bad_request' });
  }
  if (seen.has(idempotencyKey)) {
    return res.json(seen.get(idempotencyKey));
  }
  const r = Math.random();
  if (r < FAIL_RATE / 2) {
    return;
  }
  if (r < FAIL_RATE) {
    return res.status(500).json({ error: 'boom' });
  }
  const ok = {
    captureId: `cap_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    status: 'captured',
    amountCents,
  };
  seen.set(idempotencyKey, ok);
  res.json(ok);
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`payment-mock listening on ${port}`));
