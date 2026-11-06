# The party-game bones: Holy Huddle and Spark Wars

Two games run on these bones. In both, the TV shows a room code, everyone joins on their phone, and the TV runs the
game:

| Game | Players | Phones join at | The TV opens |
| --- | --- | --- | --- |
| **Holy Huddle**, inside Trivia Holy Party | 8, then up to 40 watching | `holyhuddle.thecrossroads.workers.dev` | `/tv` there (the whole game), or the game on itch.io |
| **Spark Wars**, for the youth group (`../spark/`) | 30, then up to 20 watching | `sparkwars.thecrossroads.workers.dev` | `/tv` there |

- `server/`: the room server (Cloudflare Workers + Durable Objects). `src/relay.js` is the shared relay: rooms, codes,
  joining, name checks, limits, passing messages. `src/holy.js` and `src/spark.js` are the two sites: each serves its
  own pages and makes rooms only for its own game. Each game's room size and icons are in `GAMES` in `relay.js`.
- `phone/`: the phone page, shared. `build.py` makes a copy for each game with its own look (`<html data-game>`).
- `../js/huddle.js`: Holy Huddle on the TV. `../spark/spark.js`: Spark Wars on the TV.
- `PROTOCOL.md`: every message between the TV, the phones and the relay.

## Build, run, test, deploy

```
python3 huddle/build.py     # builds server/static/holy/ and server/static/spark/ (phone.html and tv.html for each)
cd huddle/server
npm install
npm run dev                 # Holy Huddle on http://127.0.0.1:8787
npm run dev:spark           # Spark Wars on http://127.0.0.1:8788
npm test                    # 68 relay checks against the Holy Huddle site (a fake TV and 20 fake phones)
npm run test:spark          # 13 checks against the Spark Wars site (34 fake phones: 30 players, 4 watching)
npm run deploy              # Holy Huddle (needs a Cloudflare API token with Workers edit access)
npm run deploy:spark        # Spark Wars
```

Always run `build.py` before deploying: each site ships the pages built last.

Cost: the Cloudflare free plan (no card on file). Over a free limit, requests fail; nothing is ever charged. A game
of Spark Wars with 30 players sends a few thousand messages, far inside the free daily allowance.

## Where it runs

- `https://holyhuddle.thecrossroads.workers.dev`: the Holy Huddle join page, and `/tv` the whole of Trivia Holy Party.
- `https://sparkwars.thecrossroads.workers.dev`: the Spark Wars join page, and `/tv` Spark Wars for the TV.
- The church's Cloudflare account, free plan, no card. `holyhuddle.pages.dev` is reserved too, but uploads to
  Cloudflare Pages don't work from a cloud session, so the servers hand out the pages themselves.
- Testing the live sites: `node test/bots.mjs https://holyhuddle.thecrossroads.workers.dev https://holyhuddle.thecrossroads.workers.dev --live`
  and `node test/spark.mjs https://sparkwars.thecrossroads.workers.dev`.
