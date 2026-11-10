const { writeState, sanitize } = require('../lib/kv');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    const state = sanitize(body);
    await writeState(state);
    res.status(200).json({ ok: true, state });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
