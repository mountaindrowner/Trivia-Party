# Holy Huddle

The multiplayer party mode for Trivia Holy Party: the TV shows a room code, everyone joins on their phone at
`holyhuddle.thecrossroads.workers.dev`, and the game plays on the TV. The plan is in the "Party Room Platform Plan" doc.

- `server/`: the server (Cloudflare Workers + Durable Objects): rooms, plus the join page and the game for the TV.
- `phone/`: the join page phones open.
- `../js/huddle.js`: Holy Huddle on the TV, inside the game (the **📱 Holy Huddle** button on the title screen).
- `PROTOCOL.md`: every message between the TV, the phones and the relay.

## Server

```
python3 huddle/build.py   # builds server/static/phone.html and tv.html
cd huddle/server
npm install
npm run dev     # local relay on http://127.0.0.1:8787
npm test        # 68 checks with a fake TV and 20 fake phones (65 against the live server; see the top of test/bots.mjs)
npm run deploy  # needs a Cloudflare API token with Workers edit access
```

Cost: the Cloudflare free plan (no card on file). Over a free limit, requests fail; nothing is ever charged.

## Where it runs

- `https://holyhuddle.thecrossroads.workers.dev`: the join page for phones, and the server.
- `https://holyhuddle.thecrossroads.workers.dev/tv`: the game, ready for the TV (Holy Huddle on the title screen).
- The church's Cloudflare account, free plan, no card. `holyhuddle.pages.dev` is reserved too, but uploads to
  Cloudflare Pages don't work from a cloud session, so the server hands out the pages itself.
- Testing the live server: `node test/bots.mjs https://holyhuddle.thecrossroads.workers.dev https://holyhuddle.thecrossroads.workers.dev --live`.
