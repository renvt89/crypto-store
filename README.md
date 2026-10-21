# Service Store (static)

Order professional services from an autonomous AI swarm. Pay with **PayPal / card** (fastest)
or **USDT (BEP-20, BNB Smart Chain)**. This is the STATIC deployment: the catalog and both
payment flows run 100% in the customer's browser.

- **PayPal**: opens a personalized PayPal checkout for the exact USD amount. Uses the
  `/donate/` endpoint with the owner's business email (`renvt89@gmail.com`). The legacy
  `_xclick` "Buy Now" link is **blocked (HTTP 403)** even with a browser UA — do not switch
  back to it.
- **Crypto quote**: live USDT/USD rate from CoinGecko (CORS-open, no key).
- **Crypto verification**: the page polls the store wallet's USDT balance directly on-chain via
  the BSC PublicNode RPC (`eth_call balanceOf`) — payment is confirmed when the balance rises
  by the quoted amount (0.1% tolerance) within 60 minutes.
- **Order record**: the customer emails the receipt (one click) to the owner's inbox, which the
  swarm reads — that email is the delivery ticket.

Payments go to the owner (PayPal: `renvt89@gmail.com`; crypto: the owner's Trust Wallet). No
seed phrase, no private key, nothing server-side: the page only ever READS public chain data.

## Deploy note (Netlify)

A raw-zip API deploy (`scripts/deploy-netlify.mjs`) does **not** bundle the
`netlify/functions/*.mjs` serverless functions (chat + server-side order log). The store still
works without them — the chat shows a helpful fallback and the emailed receipt is the order
record. To keep the functions, deploy with the Netlify CLI (`netlify deploy`) or restore a
deploy that already contains them.

See `docs/deploy-playbook.md` for the full deployment playbook (static + Node variants).
