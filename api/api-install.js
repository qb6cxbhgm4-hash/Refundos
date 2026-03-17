// /api/install.js
import crypto from 'crypto';

export default function handler(req, res) {
  const shop = req.query.shop;

  if (!shop || !shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
    return res.status(400).send('Missing or invalid ?shop= parameter. Must be yourstore.myshopify.com');
  }

  const state = crypto.randomBytes(16).toString('hex');

  // Store state in a cookie so we can verify it in /api/callback
  res.setHeader('Set-Cookie', `shopify_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`);

  const params = new URLSearchParams({
    client_id:    process.env.SHOPIFY_API_KEY,
    scope:        process.env.SHOPIFY_SCOPES,
    redirect_uri: process.env.SHOPIFY_REDIRECT_URI,
    state,
    'grant_options[]': 'per-user',
  });

  const installUrl = `https://${shop}/admin/oauth/authorize?${params.toString()}`;

  return res.redirect(302, installUrl);
}
