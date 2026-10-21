// Netlify Function: server-side order records for the crypto store.
// Persists orders to Netlify Blobs (runtime-provided @netlify/blobs) so orders survive the
// customer's browser. The store's payment layer remains client-side (on-chain verify) —
// this is the durable order log + the delivery queue the swarm reads.
import { getStore } from '@netlify/blobs';

const STORE = getStore('crypto-orders');

const readBody = async (req) => {
  try {
    const raw = await req.text();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export default async (req) => {
  if (req.method === 'POST') {
    const b = await readBody(req);
    const serviceId = String(b.serviceId || '').slice(0, 80);
    const contact = String(b.contact || '').slice(0, 120);
    if (!serviceId || contact.length < 3) {
      return new Response(JSON.stringify({ ok: false, error: 'serviceId and contact are required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const order = {
      id: crypto.randomUUID(),
      serviceId,
      contact,
      priceUsd: Number(b.priceUsd) || 0,
      amountCrypto: Number(b.amountCrypto) || 0,
      currency: String(b.currency || 'USDT'),
      chain: String(b.chain || 'bsc'),
      address: String(b.address || ''),
      ts: new Date().toISOString(),
      status: 'pending',
    };
    await STORE.set(order.id, JSON.stringify(order), { metadata: { ts: order.ts, serviceId, contact } });
    return new Response(JSON.stringify({ ok: true, orderId: order.id, ...order }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  // GET: recent orders (metadata only).
  const { blobs } = await STORE.list({ prefix: '', paginate: true });
  const rows = (blobs || []).slice(-20).reverse().map((b) => ({ key: b.key, ...(b.metadata || {}) }));
  return new Response(JSON.stringify({ ok: true, orders: rows }), { status: 200, headers: { 'content-type': 'application/json' } });
};
