const { readState } = require('../lib/kv');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    res.status(200).json(await readState());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
