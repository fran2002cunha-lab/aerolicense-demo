module.exports = async function handler(req, res) {
  const base = process.env.RAILWAY_API_URL;
  if (!base) {
    return res.status(500).json({ error: 'RAILWAY_API_URL not configured' });
  }

  const pathParts = req.query.path || [];
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : pathParts;
  const qs = req.url.split('?')[1];
  const target = `${base}/${pathStr}${qs ? '?' + qs : ''}`;

  try {
    const upstream = await fetch(target, { method: req.method });

    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);

    const buffer = await upstream.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
};
