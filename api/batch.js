// ─────────────────────────────────────────
// /api/batch.js
// POST /api/batch
//
// Body: array of refund requests
// [
//   { productPrice: 18, returnCost: 13, isVIP: false },
//   { productPrice: 89, returnCost: 12, isVIP: false },
//   ...
// ]
//
// Returns array of decisions (same order as input)
// ─────────────────────────────────────────

function decide(item) {
  const price = parseFloat(item.productPrice);
  const rCost = parseFloat(item.returnCost);
  const vip   = item.isVIP === true || item.isVIP === 'true';

  if (isNaN(price) || isNaN(rCost)) {
    return { verdict: 'error', reason: 'Invalid price values' };
  }

  if (vip)           return { verdict: 'refund_without_return', reason: 'VIP customer',                         moneySaved: rCost };
  if (rCost > price) return { verdict: 'refund_without_return', reason: 'Return cost exceeds product value',     moneySaved: rCost };
  if (price > 50)    return { verdict: 'return_required',       reason: 'High-value item — return required',    moneySaved: 0     };
                     return { verdict: 'refund_without_return', reason: 'Low-value item — approved',            moneySaved: rCost };
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Use POST' });

  const items = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Body must be an array of refund requests.' });
  }
  if (items.length > 100) {
    return res.status(400).json({ error: 'Max 100 items per batch.' });
  }

  const results = items.map((item, index) => ({
    index,
    ...decide(item),
    input: item,
  }));

  const totalSaved = results.reduce((sum, r) => sum + (r.moneySaved || 0), 0);

  return res.status(200).json({
    count:      results.length,
    totalSaved: parseFloat(totalSaved.toFixed(2)),
    results,
    processedAt: new Date().toISOString(),
  });
}
