// /api/callback.js
import crypto from 'crypto';

// ── Verify Shopify HMAC signature ─────────────────────────────────────────────
function verifyHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&');

  const digest = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  // Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

// ── Parse cookies helper ───────────────────────────────────────────────────────
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { shop, code, state, hmac } = req.query;

  // 1. Validate required params
  if (!shop || !code || !state || !hmac) {
    return res.status(400).send('Missing required parameters (shop, code, state, hmac).');
  }

  // 2. Validate shop domain
  if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
    return res.status(400).send('Invalid shop domain.');
  }

  // 3. Verify HMAC
  if (!verifyHmac(req.query)) {
    return res.status(401).send('HMAC verification failed. Request may have been tampered with.');
  }

  // 4. Verify state matches what we set in /api/install (CSRF protection)
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.shopify_state || cookies.shopify_state !== state) {
    return res.status(401).send('State mismatch. Possible CSRF attack.');
  }

  // 5. Exchange authorization code for permanent access token
  let accessToken;
  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Token exchange failed:', err);
      return res.status(500).send('Failed to exchange code for access token.');
    }

    const tokenData = await tokenResponse.json();
    accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).send('No access token returned from Shopify.');
    }

  } catch (err) {
    console.error('Token exchange error:', err);
    return res.status(500).send('Internal error during token exchange.');
  }

  // 6. Clear the state cookie
  res.setHeader('Set-Cookie', 'shopify_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Store the access token (replace this with your actual storage)
  //
  //    Options:
  //    a) Save to Supabase:
  //       await supabase.from('shops').upsert({ shop, access_token: accessToken });
  //
  //    b) Save to a database (Postgres, MySQL, etc.)
  //
  //    For now we just log it — replace this block before going to production.
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`✅ Shop installed: ${shop}`);
  console.log(`   Access token: ${accessToken}`);

  // 8. Redirect merchant to your app dashboard
  return res.redirect(302, `/dashboard.html?shop=${shop}`);
}
