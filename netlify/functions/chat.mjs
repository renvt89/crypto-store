// Netlify Function: sales-support chat for the crypto store.
// Uses keyless free LLMs (no API secret — Netlify free plan can't store secrets): OVH's
// Qwen3.5-397B first, Pollinations as backup, then a deterministic fallback. Reasoning
// fields are stripped; only the assistant's final text is returned.
const CATALOG = [
  { id: 'resume', title: 'Professional resume rebuild (PDF + DOCX)', priceUsd: 35, delivery: 'manual' },
  { id: 'landing', title: 'One-page product landing page', priceUsd: 60, delivery: 'manual' },
  { id: 'codereview', title: 'AI code review (repo up to 5k lines)', priceUsd: 25, delivery: 'manual' },
  { id: 'promptpack', title: 'Agent prompt library pack', priceUsd: 12, delivery: 'scripted' },
];
const WALLET = '0x59688BB311653840efb1A2e4fd5960570F7Fe137';
const SYS = `You are the support bot for an autonomous AI-swarm services store. Answer ONLY about these services, ordering and payment. Prices in USD: ${CATALOG.map((c) => `${c.title} — $${c.priceUsd}`).join('; ')}. Payment: PayPal/card (fastest) or USDT (BEP-20, BNB Smart Chain) to ${WALLET} verified on-chain. Manual delivery within 24-48h, payments final. Be honest and concise (under 150 words). Refuse off-topic requests politely.`;
const FALLBACK = `I can help with: ${CATALOG.map((c) => `${c.title} ($${c.priceUsd})`).join(', ')}. Pay in USDT (BEP-20, BSC) to ${WALLET}; we verify on-chain and deliver within 24-48h. Payments are final.`;

async function ask(provider) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), provider.ms || 25000);
  try {
    const r = await fetch(provider.url, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: provider.model, messages: provider.messages, max_tokens: 300 }),
    });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const j = await r.json();
    const c = j?.choices?.[0]?.message;
    const reply = String(c?.content || '').trim();
    if (!reply) throw new Error('empty reply');
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

export default async (req) => {
  let msg = '';
  try { msg = String((await req.json()).message || '').slice(0, 800); } catch { /* ignore */ }
  if (!msg.trim()) return new Response(JSON.stringify({ ok: false, error: 'message required' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const messages = [{ role: 'system', content: SYS }, { role: 'user', content: msg }];
  const providers = [
    { url: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions', model: 'Qwen3.5-397B-A17B', messages, ms: 25000 },
    { url: 'https://text.pollinations.ai/openai/chat/completions', model: 'openai', messages, ms: 20000 },
  ];
  for (const p of providers) {
    try {
      return new Response(JSON.stringify({ ok: true, reply: await ask(p) }), { status: 200, headers: { 'content-type': 'application/json' } });
    } catch { /* try next */ }
  }
  return new Response(JSON.stringify({ ok: true, reply: FALLBACK }), { status: 200, headers: { 'content-type': 'application/json' } });
};
