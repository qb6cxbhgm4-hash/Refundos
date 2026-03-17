// ─────────────────────────────────────────
// /api/health.js
// GET /api/health
// Returns: { status: "ok", ... }
// Use this to confirm your backend is live.
// ─────────────────────────────────────────

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    service: 'RefundOs API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
