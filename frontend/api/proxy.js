module.exports = async function handler(req, res) {
  const base = process.env.RAILWAY_API_URL;
  if (!base) return res.status(500).json({ error: 'RAILWAY_API_URL not configured' });

  const apiPath = decodeURIComponent(req.query.p || '/');
  const target = base + apiPath;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const contentType = req.headers['content-type'];

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: contentType ? { 'content-type': contentType } : undefined,
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    const buffer = await upstream.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err) {
    res.status(502).json({ error: 'proxy error', message: err.message });
  }
};
