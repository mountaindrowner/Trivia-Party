# Holy Huddle

The multiplayer party mode for Trivia Holy Party: the TV shows a room code, everyone joins on their phone at
`holyhuddle.pages.dev`, and the game plays on the TV. The plan is in the "Party Room Platform Plan" doc.

- `server/`: the relay (Cloudflare Workers + Durable Objects). One small object per room.
- `PROTOCOL.md`: every message between the TV, the phones and the relay.

## Server

```
cd huddle/server
npm install
npm run dev     # local relay on http://127.0.0.1:8787
npm test        # 65 checks with a fake TV and 20 fake phones (62 against the live server; see the top of test/bots.mjs)
npm run deploy  # needs a Cloudflare API token with Workers edit access
```

Cost: the Cloudflare free plan (no card on file). Over a free limit, requests fail; nothing is ever charged.

## Where it runs

- Relay: `https://holyhuddle-relay.thecrossroads.workers.dev` (the church's Cloudflare account, free plan).
- Phone page (phase 2): `https://holyhuddle.pages.dev`, claimed and waiting.
- Testing the live relay: `node test/bots.mjs <relay-url> https://holyhuddle.pages.dev --live`.
