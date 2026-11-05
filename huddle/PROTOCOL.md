# Holy Huddle protocol

How the TV (host), the phones and the relay talk. The relay knows nothing about any game: it runs rooms and passes
messages. The TV runs the game and decides what every phone shows.

Relay: `https://holyhuddle-relay.thecrossroads.workers.dev` (code in `server/`). Every message is one JSON object
with a `t` (type) field.

## Plain requests

| Request | Who | Answer |
| --- | --- | --- |
| `POST /api/rooms` `{ "game": "holy-trivia" }` | TV | `201 { code, hostKey, game }`. Keep `hostKey` secret: it is the only way to run the room. |
| `GET /api/rooms/:code` | phone | `200 { code, game, locked, players, audience, maxPlayers, avatars }` or `404` |
| `GET /health` | anyone | `{ ok: true }` |

Codes are 4 letters from `BCDFGHJKLMNPRSTVWZ` (no vowels, so no words). Lowercase and spaces are fine.

## Live lines (WebSocket)

- TV: `wss://…/ws/:code?role=host&key=<hostKey>`. A second TV connection with the key takes over (the first gets
  `replaced`).
- Phone: `wss://…/ws/:code?role=player`, then `join` or `rejoin` as its first message.

### TV → relay

| Message | Does |
| --- | --- |
| `{ t: "to", to, data }` | Sends `{ t: "msg", data }` to phones. `to` = `"all"`, `"players"`, `"audience"` or a list of player ids. |
| `{ t: "kick", id }` | Removes a player for good (they get `kicked` and can't rejoin). |
| `{ t: "lock", locked }` | A locked room turns new phones away. Players already in can still rejoin. |
| `{ t: "vip", id }` | Makes another player the VIP. |
| `{ t: "end" }` | Ends the room: phones get `ended`, everything is deleted. |
| `{ t: "time", c }` | The relay answers `{ t: "time", c, s }` with its clock, for timers. |

### Relay → TV

| Message | When |
| --- | --- |
| `{ t: "room", event, room, now? }` | On connect (`event.kind: "host-connected"`) and after every change: `join`, `leave` (dropped, still in the game), `back`, `kick`, `lock`, `unlock`, `vip`. `room` = `{ code, game, locked, vip, players: [{ id, name, avatar, audience, connected, joinedAt }] }`. |
| `{ t: "input", id, data, at }` | A phone sent something. `at` = the relay's clock when it arrived, so speed is fair for everyone. |
| `{ t: "replaced" }` | Another TV took over this room. |

### Phone → relay

| Message | Does |
| --- | --- |
| `{ t: "join", name, avatar }` | Joins. The first 8 are players, the rest (up to 40) are audience. The first player is the VIP. |
| `{ t: "rejoin", id, key }` | Comes back after dropping out, with the id and key from `joined` (kept on the phone). |
| `{ t: "input", data }` | Anything for the TV: an answer, a tap, a vote. |
| `{ t: "time", c }` | Clock check, as for the TV. |
| `{"t":"hb"}` | Keep-alive; answered `{"t":"hb"}` without waking the room. |

### Relay → phone

| Message | When |
| --- | --- |
| `{ t: "hello", code, game, avatars, now }` | On connect. |
| `{ t: "joined", id, key, name, avatar, audience, vip, host, rejoined? }` | Joined or rejoined. Save `id` and `key` to rejoin. |
| `{ t: "you", id, name, avatar, vip, audience }` | This phone's role changed (became VIP). |
| `{ t: "msg", data }` | Something from the TV: what to show. |
| `{ t: "host", on }` | The TV dropped out or came back. |
| `{ t: "error", code }` | `locked`, `full`, `rejoin`, `too-fast`, `name-empty`, `name-long`, `name-chars`, `name-word`, `name-taken` |
| `{ t: "kicked" }`, `{ t: "ended", why }` | Removed, or the room ended (`ended` or `expired`). The line then closes. |

## Limits and safety

- Names: 1–12 letters, numbers, spaces, hyphens and apostrophes, with a bad-word filter that sees through
  leetspeak, spacing and repeated letters (`server/src/names.js`). Names are unique in a room.
- Each phone may send about 12 messages a second (bursts of 30) and 2 KB per message; the TV 60 a second and 16 KB.
  Over that, the line is closed.
- Per internet address, per 10 minutes: 20 rooms made, 200 code lookups, 400 live lines.
- Only allowed web pages (the phone page and the TV page on itch.io) can connect from a browser (`ALLOWED_ORIGINS`).
- Rooms delete themselves after 2 hours with nothing happening, or 12 hours at most. Nothing about players is kept
  after that. No accounts, no cookies, no logs of names.
