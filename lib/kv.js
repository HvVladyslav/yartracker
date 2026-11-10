// Мінімальний клієнт Vercel KV / Upstash Redis через REST API (без залежностей).
const KEY = 'loan_tracker_state';

const DEFAULT_STATE = {
  amount: 139397,
  rate: 3.5,
  payment: 2500,
  start: '',          // порожньо = поточний місяць на клієнті
  overrides: {},      // { "0": 3000, "5": 1500 } — індивідуальні платежі по місяцях
  paid: []            // [0, 1, 2] — індекси сплачених місяців
};

async function redis(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN не задано');
  const res = await fetch(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `KV HTTP ${res.status}`);
  return data.result;
}

async function readState() {
  const raw = await redis(['GET', KEY]);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_STATE, ...s };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state) {
  await redis(['SET', KEY, JSON.stringify(state)]);
}

// Валідація та нормалізація вхідного стану
function sanitize(b) {
  const num = (v, d, min = 0, max = 1e9) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  const overrides = {};
  if (b && typeof b.overrides === 'object' && b.overrides) {
    for (const [k, v] of Object.entries(b.overrides)) {
      const i = Number(k), n = Number(v);
      if (Number.isInteger(i) && i >= 0 && i < 720 && Number.isFinite(n) && n >= 0 && n <= 1e9) overrides[i] = n;
    }
  }
  const paid = Array.isArray(b && b.paid)
    ? [...new Set(b.paid.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < 720))].sort((a, c) => a - c)
    : [];
  const start = /^\d{4}-\d{2}$/.test(b && b.start) ? b.start : '';
  return {
    amount: num(b && b.amount, DEFAULT_STATE.amount),
    rate: num(b && b.rate, DEFAULT_STATE.rate, 0, 100),
    payment: num(b && b.payment, DEFAULT_STATE.payment),
    start, overrides, paid
  };
}

module.exports = { readState, writeState, sanitize, DEFAULT_STATE };
