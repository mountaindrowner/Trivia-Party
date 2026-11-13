# Party-game protocol (Holy Huddle and Spark Wars)

How the TV (host), the phones and the relay talk. The relay knows nothing about any game: it runs rooms and passes
messages. The TV runs the game and decides what every phone shows.

Servers (the same code in `server/`, one site per game; each serves its join page at `/` and its game at `/tv`):

| Site | Game | Players | Icons |
| --- | --- | --- | --- |
| `https://holyhuddle.thecrossroads.workers.dev` | `holy-trivia` | 8, then 40 in the audience | 12 animals (`sheep`, `donkey`, ...) |
| `https://sparkwars.thecrossroads.workers.dev` | `spark-wars` | 30, then 20 in the audience | 24 icons (`bolt`, `flame`, ...) |

A site only makes rooms for its own game. Every message is one JSON object with a `t` (type) field.

## Plain requests

| Request | Who | Answer |
| --- | --- | --- |
| `POST /api/rooms` `{ "game": "holy-trivia" }` | TV | `201 { code, hostKey, game }`. Keep `hostKey` secret: it is the only way to run the room. The game is always the site's own. |
| `GET /api/rooms/:code` | phone | `200 { code, game, locked, players, audience, maxPlayers, avatars }` or `404` |
| `GET /health` | anyone | `{ ok: true }` |

Codes are 4 letters from `BCDFGHJKLMNPRSTVWZ` (no vowels, so no words). Lowercase and spaces are fine.

## Live lines (WebSocket)

- TV: `wss://…/ws/:code?role=host&key=<hostKey>`. A second TV connection with the key takes over (the first gets
  `replaced`).
- Phone: `wss://…/ws/:code?role=player`, then `join` or `rejoin` as its first message, within 30 seconds. A room
  takes at most players + audience + 20 lines in all (a room's worth may be waiting to join at once); past that it
  answers `429 busy`.

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
  leetspeak, spacing, repeated letters and lookalike letters (`server/src/names.js`). Names are unique in a room.
  Typed answers (`text` in an input) go through the same filter before the TV sees them.
- The pages are served with a Content-Security-Policy: only their own inline scripts (by hash) run, and they only
  connect to their own site.
- Each phone may send about 8 messages a second (bursts of 30) and 2 KB per message; the TV 40 a second (bursts of
  400, enough to send 30 phones their screens several times over at once) and 16 KB. Over that, the line is closed.
  A whole 30-player night peaks around 25 a second from the TV, during Talents.
- Each room's TV may send 60,000 messages an hour (`HOST_PER_HOUR`); after that the TV is cut off until the next hour.
  A Spark Wars night uses well under half of it.
- Per internet address (per /64 network for IPv6), per 10 minutes: 20 rooms made, 200 code lookups (300 for Spark Wars), 400 live lines (600 for
  Spark Wars, where 30 phones on one church Wi-Fi share an address).
- Other websites can't connect from a browser: a request that names another page (`Origin`) must be on
  `ALLOWED_ORIGINS` (this site, the TV page on itch.io). This site's own pages send no Origin on plain requests.
- Rooms delete themselves after 2 hours with nothing happening, or 12 hours at most. Nothing about players is kept
  after that. No accounts, no cookies, no logs of names.

## Games the server runs itself (Signal Divide)

For most games the TV (or the host's phone) runs the game and the relay only passes messages. **Signal Divide**
(`signal-divide`, on the Bonfire site) is different: its cards must stay secret even from the host's phone, so the
room runs the game itself (`server/src/divide.js`) and the host's phone is only a console. In such a room:

- A phone's `{ t: "input", data }` goes to the engine, not the host. The phone gets `{ t: "msg", data: { screen:
  "divide", view } }` after every change: its own view only (its card, its zone's people, leader, votes and picks,
  the clock as a server deadline). A refused tap comes back with `toast` (the reason).
  Taps: `{ type: "ready", on }`, `{ type: "here" }`, `{ type: "vote", for }` (an id, or null to take it back),
  `{ type: "offer", to }`, `{ type: "accept" }`, `{ type: "decline" }`, `{ type: "select", ids }`, `{ type: "lock" }`,
  `{ type: "predict", pick: "signal" | "static" }`.
- The host sends `{ t: "cmd", data }` for the console (`play` (on, name), `deal`, `start`, `pause`, `resume`,
  `fixZone` (id, zone), `fixLeader` (zone, id), `abort`, `rematch`) and, when the host plays, `{ t: "me", data }` for
  their own taps. It gets `{ t: "view", data, me }`: the console view (head counts, arrivals, leaders, locks, the
  log; never a card before the result) and, when the host plays, their own player view. Refused: `{ t: "error",
  code: "sd-<reason>" }`. `to`, `lock` and `vip` from the host are ignored (the room decides); `kick` only in the lobby.
- The room locks itself when it's full (15, counting a host who plays) and when the cards are dealt.
- The engine's deadlines (a round ending, a leader's grace, the start countdown, the prediction) wake the room
  through its alarm, so the game runs on with no phone connected at all.

## Screens the TV sends (`data` in `msg`)

The phone page draws these; anything it doesn't know shows the lobby. Every screen may also carry:

- `lost: true`: the player is a Lost Sheep (Holy Huddle); the phone shows a badge.
- `vip`: one button, or a list of buttons, shown only on the VIP's phone: `{ label, action }`; a tap sends
  `{ type: "vip", action }`.
- `badge: { text, color }`: shown under the player's name, e.g. their team (Spark Wars).
- `header`: a line above the prompt or result, e.g. "💰 120 talents · 4th place", outlined in the badge color.

| `screen` | Fields | The phone shows | It sends |
| --- | --- | --- | --- |
| `lobby` | | The player's animal and name, "You're in!", and for the VIP **Everybody's in!** | `{ type: "start" }` |
| `wait` | `title`, `text` | A waiting message | |
| `message` | `title`, `text` | A message | |
| `choices` | `round`, `prompt`, `options`, `seconds`; optional `note` (a gold tag on top), `hint` (the line under the buttons), `locked` (shown once picked), `keys` (the symbols on the buttons), `look` (`jars` or `targets` for Spark Wars, `two` for Bonfire's this-or-that), `skip` (a button label: a way out) | Answer buttons and a time bar | `{ type: "pick", round, pick }` once, or `{ type: "skip", round }` |
| `tap` | `round`, `title`, `text`, `seconds`, `label` | A big button to tap as fast as you can | `{ type: "taps", round, n }` a few times a second |
| `order` | `round`, `title`, `items`, `seconds` | Items to tap first to last, with Undo | `{ type: "order", round, seq }` (indexes into `items`) |
| `multi` | `round`, `prompt`, `options`, `seconds` | Tap all that apply, then **Lock it in!** | `{ type: "multi", round, picks }` |
| `write` | `round`, `prompt`, `placeholder`, `max` (40), `auto` (a button label, e.g. "🎲 Lie for me"), `seconds`, `hint`, `locked`, `note`, `button` | A text box to type a short answer (Spark Wars' Bluff the Bible) | `{ type: "write", round, text }`, or `{ type: "write", round, auto: true }` |
| `slots` | `round`, `title`, `card`, `items` (the line so far, first to last), `seconds`, `hint`, `locked` | The new card, and the line with a gap button before, between and after the cards (Timeline) | `{ type: "slot", round, at }` (0 = before the first card) |
| `slider` | `round`, `prompt`, `min` (0), `max` (100), `unit` ("%"), `start` (50), `step`, `seconds`, `hint`, `locked`, `button` | A big number and a slider, then **Lock it in!** (Bonfire's Read the Room) | `{ type: "slider", round, value }` |
| `result` | `good`, `title`, `points`, `text`, `after` (the line under it; `""` for none) | Right or wrong, and the points | |
| `final` | `place`, `points`, `of`, `audience`, `unit` (default "points"), `text` | The medal or place, and the points | |
| `divide` | `view` (from the server's engine), `toast` | Signal Divide: a player's screen (`bonfire/divide/view.js`) | the taps above |
| `secret` | `stage` (`wait`, `deal`, `night`, `day`, `vote`, `reveal-wait`, `reveal`), `round`, `title`, `text`, `how` (steps: [icon, text]), `seconds`, `card` (`icon`, `name`, `team`, `teamName`, `goal`, `night`), `lines` (what you learned), `linesTitle`, `deck`, `button`, `ready`, `action` (`kind`: `player`, `two`, `center`, `counselor`, `hunch` or `vote`; `prompt`, `players` [`{ id, name, face }`], `skip`, `done`, `doneText`), `reveal` | Lights Out's secret card (`bonfire/night/card.js`): face down, held to peek; the night's job or the vote under it; or the reveal | `{ type: "ready", round }`, `{ type: "night", round, players, center }`, `{ type: "vote", round, target }` |

The TV numbers every question, trial and race round (`round`) and ignores answers for any other round.

**Typing is checked by the relay.** Any input with a `text` field is run through `checkText` (`server/src/names.js`:
at most 40 characters of letters, numbers, spaces and simple punctuation, no emoji, and the same bad-word filter as
names, minus Bible words like "devil" or "dead"). A refused text never reaches the TV; the phone gets
`{ t: "error", code: "text-word" | "text-chars" | "text-long" | "text-empty", round }` and asks for another.
