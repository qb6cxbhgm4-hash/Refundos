// ─────────────────────────────────────────
// /api/decision.js
// POST /api/decision
//
// Body (JSON):
// {
//   "productPrice":  25,          // number — item value in USD
//   "returnCost":    13.20,       // number — shipping + labor cost
//   "isVIP":         false,       // boolean — is this a loyal customer?
//   "reason":        "Changed mind",  // string — customer's stated reason
//   "customerId":    "cust_123"   // string — your customer ID (optional)
// }
// ─────────────────────────────────────────

export default function handler(req, res) {
  // Allow requests from your frontend (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Browser sends OPTIONS first — just say OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // ── 1. Read the incoming data ──────────────────────────────
  const { productPrice, returnCost, isVIP, reason, customerId } = req.body;

  // ── 2. Validate required fields ───────────────────────────
  if (productPrice === undefined || returnCost === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: productPrice and returnCost are required.'
    });
  }

  const price  = parseFloat(productPrice);
  const rCost  = parseFloat(returnCost);
  const vip    = isVIP === true || isVIP === 'true';

  if (isNaN(price) || isNaN(rCost)) {
    return res.status(400).json({
      error: 'productPrice and returnCost must be numbers.'
    });
  }

  // ── 3. Decision logic ──────────────────────────────────────
  let verdict;
  let reason_text;
  let saved = 0;

  if (vip) {
    // Rule 1: VIP customers always get instant refund, no return needed
    verdict     = 'refund_without_return';
    reason_text = 'VIP customer — instant refund approved';
    saved       = rCost;

  } else if (rCost > price) {
    // Rule 2: Returning the item costs more than the item is worth
    verdict     = 'refund_without_return';
    reason_text = `Return cost ($${rCost.toFixed(2)}) exceeds product value ($${price.toFixed(2)})`;
    saved       = rCost;

  } else if (price > 50) {
    // Rule 3: High-value item — worth getting back
    verdict     = 'return_required';
    reason_text = `High-value item ($${price.toFixed(2)}) — return required before refund`;
    saved       = 0;

  } else {
    // Rule 4: Everything else — borderline, refund without return
    verdict     = 'refund_without_return';
    reason_text = 'Low-value item — refund without return approved';
    saved       = rCost;
  }

  // ── 4. Build the response ──────────────────────────────────
  const result = {
    verdict,          // 'refund_without_return' | 'return_required'
    reason: reason_text,
    moneySaved: parseFloat(saved.toFixed(2)),
    input: {
      productPrice: price,
      returnCost:   rCost,
      isVIP:        vip,
      customerReason: reason || null,
      customerId:   customerId || null,
    },
    processedAt: new Date().toISOString(),
  };

  return res.status(200).json(result);
}
