export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const base = process.env.RAILWAY_API_URL;
  if (!base) {
    res.status(500).json({ error: 'RAILWAY_API_URL not configured' });
    return;
  }

  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');
  const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${base}/${pathStr}${queryStr}`;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-proto'];

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });

  res.status(upstream.status);
  for (const [key, value] of upstream.headers.entries()) {
    if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  }

  const buffer = await upstream.arrayBuffer();
  res.end(Buffer.from(buffer));
}
