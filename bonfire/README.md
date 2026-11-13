# Bonfire Ice Breaker

A get-to-know-you night for up to 40 young adults, each on their own phone. No teams: everyone mixes. Everyone answers a few quick, fun
questions about themselves while the room fills up, then the show runs a string of mini-games built out of those
answers, and ends on the Campfire Report. The point isn't the score: by the end everyone knows a few surprising
things about people they didn't know before.

- **Play:** open `https://bonfire.thecrossroads.workers.dev/tv` on the TV or projector (a laptop is easiest) and
  click **Light the fire**. Everyone else goes to `bonfire.thecrossroads.workers.dev` on their phone, or scans the
  QR code, and types the 4-letter code.
- **Two more modes on this site:** **Lights Out** (`/night`, one night of wolves at camp, 3 to 12) and **Signal
  Divide** (`/divide`, two zones and hidden teams, 12 to 15), both run from the host's phone with no TV. Below.
- **Same bones as Spark Wars and Holy Huddle:** the room server and the phone page are in `../huddle/` (the
  `bonfire` room type allows 40 players and 20 in the audience).
- **Files:** `core.js` (the room, the questions while joining, the host's voice, the show and the Campfire Report),
  `games.js` (the four mini-games), `music.js` (the campfire guitar), `data/questions.js` (the library), `bonfire.css`, `index.html`.
  `../huddle/build.py` inlines it all into one page for the server.
- **Tests:** `node tools/run-tests.mjs e2e` plays a whole night with 40 phones (`../tests/e2e/bonfire.cjs`).

## Kindling: questions while everyone joins

As each phone joins it gets questions one at a time: 8, 10 or 12 (the leader picks), about 3 minutes.

- **Core questions:** 4 that everyone answers, so the room can be compared ("How many of us...?") and everyone
  has something to match on. Picked each night from the questions marked `core`: always two social experiments.
- **The rest at random**, so every night is different, including 2 short typed answers.
- **Skip this one** on every question. Typed answers go through the server's word filter, and the phone says
  answers can show up on the big screen with your name.
- **The TV:** everyone's name around the fire, filling with colour as they answer (lit up when they're done), and
  a live fact about the room every few seconds ("Text or call? 16 of 32 said Text").
- **The leader picks:** the games (click one to leave it out), questions each, and Faith questions on or off.
- The VIP (the first to join) can start the games from their phone.

The library (`data/questions.js`): 347 questions in 21 categories: silly and random (fights with geese, fruit
villains, things that feel illegal), the basics (eggs, seasons, introvert or extrovert), good conversation (light
but interesting, the kind icebreaker lists recommend: the best concert you've been to, a skill you'd master
instantly, a petty opinion you'll defend forever), social experiments (do you return your shopping cart, would you
press the button, could you beat a goose: two of these are in everyone's questions each night, for Read the Room),
and food, would you rather, powers, music and movies, hobbies, sports, places, animals, growing up, totally me,
tech, dreams, faith, have you ever, adulting, throwback and group chat life. Light and revealing, never too personal: no family situations, money, looks,
dating, politics, health, or where anyone lives or works. `npm run check:content` checks every one.

## The show

Each game gets a title card in its own colour, with how to play in three short steps on the TV, the full
explanation read out loud (and captioned), and the same instructions on every phone. Then it plays a few rounds. The top 10 shows between
games. Points carry across the night.

1. **🗣️ Who Said That?** (5 rounds) One typed answer in a big speech bubble, read out loud. Every phone picks who
   wrote it from 4 names; the writer's phone says "keep a straight face". Right: 100 to 150 (quicker is more); the
   writer gets 25 for everyone fooled (up to 300). Then: "It was Mia! Mia, stand up and take a bow."
2. **🔮 Read the Room** (3 rounds) "What percent of us said Books?" Everyone slides a guess on their phone; the
   meter fills to the real number. Up to 150 points for the closest. Then the rare ones get called out by name:
   "Only 3 of you said Cats: Ava, Sam and Liam. Give us a wave."
3. **🤝 Kindred Spirits** Everyone is paired with the person whose answers match theirs the most (a trio if the
   numbers are odd). Each phone shows "Your match: Pip. You agree on 4 of 4!" and its own secret number; go find
   them, ask for their number, tap it in. Found: 150 points, the first three pairs a bonus, and both phones show
   what you have in common to talk about. The TV lights up each pair as they find each other (2½ minutes).
4. **🃏 Two Truths & a Lie** (5 spotlights) Three things about one player from their answers, one flipped to false.
   Everyone guesses the lie (100 points); the player gets 25 for everyone fooled.
5. **🔥 The Campfire Report** "This is us": how the room split on the core questions, read out loud. Then kind
   awards (best poker face, reads the room, knows everybody, twin flames, most adventurous, found their match
   first), the podium, and on every phone a card with three of your own answers. **Play again** (same answers,
   new rounds) or **More questions** (5 new questions each, then play again).

## The host: a voice, no face

The device's own speech (the Web Speech API), so it can say names. It picks the best voice the device has (Edge's
"Natural" voices and the iPhone's "Enhanced" and "Premium" voices sound almost human; Chrome's "Google US English"
is fine), speaks a little slower than the device's default, one sentence at a time with a breath between them, and
keeps every line short. The caption at the bottom of the TV shows the whole line and lights up the sentence being
said. 🗣 in the lobby turns it off. On an iPhone or iPad the sound starts after the first tap on the TV page.

## The campfire guitar

`music.js`: an acoustic guitar playing by the fire, made in the browser (no audio files). Every note is a plucked
string (Karplus-Strong), tuned exactly, through a guitar-body resonance and a little reverb, a hair loose in time
and touch like a person playing. It fingerpicks open chords in G with a melody noodling over the top, and follows
the screen: sparse on the title, laid-back fingerpicking in the lobby, a strummed jam with a soft cajon and shaker
during the games, slow and warm for the report. It dips under the host's voice, and the game's little sounds
(joins, lock-ins, reveals, the winner) are guitar too. A crackling fire plays underneath. 🎸 in the lobby turns the
guitar off; 🔊 turns all sound off.

## The look

A campfire at night: twinkling stars, a moon, a shooting star now and then, pine trees and mountains, mist drifting,
fireflies, and the fire at the bottom with embers rising. Screens cross-fade (the new one rises into focus as the old
one blurs away); big moments flare the fire, flash warm light and give the stage a little jolt; titles drop in letter
by letter; scores count up; panels are frosted glass; a soft vignette and film grain sit over it all. Shrikhand (a
fat retro script) for the big words, Outfit for the rest. Each mini-game has its own colour: orange for Who Said
That?, blue for Read the Room, green for Kindred Spirits, purple for Two Truths & a Lie. The phones match
(`../huddle/phone/phone.css`, the `data-game="bonfire"` parts): screens rise in piece by piece, buttons press in,
results pop with a glow, embers drift up the background.

## Lights Out: one night of wolves at camp (`night/`)

A second Bonfire mode, for 3 to 12 people with **no TV**: made for camp. Open
`https://bonfire.thecrossroads.workers.dev/night` on your phone, tap **Start a game** (tick "I'm playing too" to get a
card yourself), and everyone scans the QR code on your phone. When everyone's in, tap **Deal the cards**. Your phone
is the narrator: it talks (the phone's own voice, with captions), plays night sounds and the campfire guitar in a
minor key, keeps the time, and shows the reveal.

It's the **one-night** style of Werewolf/Mafia, which most groups (and most reviews) rate best for a casual crowd:
nobody gets knocked out and sits bored, and a round takes about ten minutes. An original take with camp roles:

| Card | Side | At night |
| --- | --- | --- |
| 🐺 Wolf | Wolves | Sees the other wolves; a lone wolf peeks at one middle card |
| 🦝 Raccoon | Wolves | Sees the wolves (they don't know about it). Wins if no wolf is voted out, even if it is |
| 🔦 Counselor | Camp | Looks at one player's card, or two middle cards |
| 🤫 Sneak | Camp | Swaps cards with someone, and sees the new card: that's who they are now |
| 🧦 Prankster | Camp | Swaps two other players' cards, without looking |
| 😴 Sleepwalker | Camp | Swaps with a middle card without looking (always) |
| 🦉 Night Owl | Camp | Looks at their own card again at the end of the night |
| 🛏️ Bunkmate ×2 | Camp | See each other |
| 🏠 Homesick | Own | Nothing. Wins only by getting voted out |
| 🏕️ Camper | Camp | Nothing (taps a hunch) |

- **The deck** has 3 more cards than players (3 lie face down in the middle), and grows with the group: 2 wolves,
  a Counselor, a Sneak and a Prankster always; Night Owl from 4, Raccoon from 5, Homesick from 6, Bunkmates from 8,
  Sleepwalker from 9, a third wolf from 10. **Easy** keeps it to wolves, a Counselor, a Prankster and campers.
  Everyone sees which cards are in play.
- **The deal:** every phone gets a face-down card: hold your thumb on it to peek, let go and it flips back. The first
  round, the phone reads the rules out loud (and the night waits for them).
- **The night:** everyone taps at the same time, and everyone has something to tap (no job? tap a hunch), so nobody
  can tell who's doing what. The jobs are carried out in order afterwards (`rules.js`). At least 20 seconds, at
  most 75.
- **The morning:** what you learned is on the back of your card. 3, 5 or 7 minutes to talk (**+1 minute** and
  **Vote now** on the host's phone).
- **The vote:** everyone taps one person. The most votes is out (all of them on a tie), but only if someone got more
  than one vote. Vote out a wolf: the camp wins. No wolf out: the wolves win (unless Homesick went home). No
  wolves among the players at all: the camp wins only if nobody is voted out.
- **The reveal:** who's out and what they really were, said out loud, then on every phone: whether you won,
  everyone's starting and ending card, the middle cards, and "what really happened" (the night, step by step,
  also read out). **Play again** deals new cards to the same people; wins are kept for the night.
- If the host's page reloads, the round carries on. Someone who joins mid-round gets a card next round.

**Made for personal phones in a circle of people:**
- Nothing secret is ever face up: the card (and what you learned) shows only while your thumb is on it, and flips
  back when you let go or switch apps. The deal says to tilt the phone toward you first.
- At night every phone shows the same buttons, whatever the card: the players, the 3 middle cards and Skip. Only
  the small line on top says what yours can do, so nobody can tell a role from across the circle, or from who's
  tapping (everyone taps something, and morning waits at least 20 seconds).
- Each stage buzzes the phone and sweeps in with its own full-screen curtain (lights out, sunrise, the vote, "look
  up!"), so phones can go face down in laps while people talk.
- The host's phone is the only one that talks; it keeps itself awake. Players' phones stay awake too, and rejoin
  on their own if they lock or drop off the Wi-Fi.

**Explained as it goes:** the lobby on every phone shows how it works in five steps; every card in play is a chip
you can tap to read what it does at night and how it wins; each screen says what to do and what happens next; the
voice explains each stage (and the vote rule); and the reveal says why that side won ("No wolf was voted out. By the
end of the night, the wolf was Finn."), then the night step by step.
- **Files:** `rules.js` (the rules, no page: tested by `tests/lights-out-rules.cjs`), `card.js` and `card.css` (the
  secret card, on the players' phones and the host's), `night.js`, `night.css`, `index.html` (the host's page).
  The room type is `lights-out` (12 players, no audience). `node tests/e2e/lights-out.cjs` plays two rounds with 12.

## Signal Divide: two zones, hidden teams (`divide/`)

A third Bonfire mode, for **12 to 15 people** on their own phones, in two physical zones (two rooms, or two far-apart
corners), with **no TV**. Built from the design package in `../docs/signal-divide/` (start with `00_START_HERE.md`).
It's an original game inspired by the genre (two-room social deduction): its own names, story, rules text and look,
not a copy of any published game's cards or art, and not licensed by anyone.

**To play:** open `https://bonfire.thecrossroads.workers.dev/divide` on your phone, tap **Create game** (tick "I'm
playing too" to get a card yourself), and everyone scans the QR code on your phone. When everyone has tapped
**I'm ready**, tap **Lock & deal**. The lobby has a 45-second teaching script (it can read it out loud).

- **The story:** two secret teams. **Signal** (blue, broadcast rings) protects the **Beacon**; **Static** (orange,
  a zigzag) has the **Jammer**. At the end, Beacon and Jammer in the same zone: Static wins. Apart: Signal wins.
  At 13 or 15 players one person is the **Forecaster** (grey, no team), who predicts the winner before the reveal.
- **The deck:** 12: Beacon + 5 Signal, Jammer + 5 Static (zones 6/6). 13: the same plus the Forecaster (7/6).
  14: Beacon + 6, Jammer + 6 (7/7). 15: plus the Forecaster (8/7). Cards and zones are dealt separately, at random.
- **A match:** everyone goes to their zone and taps **I'm here**. Three rounds of talking (3, 2, then 1 minutes).
  Each zone has a leader (picked at random to start; anyone can be voted in by a strict majority of their zone, and
  a leader can hand the job over). At the end of each round, each leader sends **2, then 1, then 1** people to the
  other zone; both zones' picks are swapped at the same moment, and nobody moves until the time's up. A leader can't
  send themselves. A leader who doesn't lock in gets 20 more seconds, then the server picks at random (and says so).
  Movers tap **I'm in Zone B**; the next round starts 5 seconds after everyone has arrived.
- **Your card** never changes, and never shows unless you mean it to: **hold "My card"** to peek (let go, it's gone),
  or **Show team** / **Show card** to turn your phone to someone you trust (8 seconds, or **Hide now**). Switching
  apps hides it. The everyday screen has no team colours at all, and Zone A/B is where you stand, never your team.
- **The host's phone** shows the QR code, then a console: the clock, head counts, who leads each zone and whether
  they've locked in, who's still walking, **Pause/Resume**, **Start the round now** (if someone forgot to tap),
  **Stop match**, and, while paused, corrections (move someone to the zone they're really in, or set a leader),
  logged for everyone. A host who plays gets a **My game** tab: their own screen, exactly like everyone's.
- **The server runs it** (`huddle/server/src/divide.js`), not anyone's phone: the cards, the zones, the clock, the
  votes, the picks, the exchanges and the result. Each phone only ever receives its own card and its own zone's
  people, leader, votes and picks (the other zone learns only *whether* its leader has locked in). The host's
  console never receives a card, even when the host plays. A phone that drops rejoins as itself; nobody is redealt.
  The clock keeps running if the host's phone sleeps. **🔑 Recovery link** lets the host take the console over from
  another phone.
- **Needs internet** on every phone the whole match (Wi-Fi or data). No signal at all? Use the paper version in
  `../docs/signal-divide/05_HOST_CHEAT_SHEET.md`.
- **Files:** `view.js`, `view.css` (a player's screen, on the phones and the host's), `divide.js`, `divide.css`,
  `index.html` (the host's page). Tests: `tests/signal-divide-engine.mjs` (the rules, the deal at every count 1,000
  times, refused moves, and that no screen holds a card it shouldn't) and `tests/e2e/signal-divide.cjs` (whole
  matches at 12, 13, 14 and 15 on a fast clock, `DIVIDE_FAST=1`, which only a local test server sets).
- **Not in this version** (as the design says): in-app card sharing between phones, special powers, a 5-round mode,
  card swaps.

## Ideas for later

- **Find Someone Who** (bingo): a 4×4 card of the room's own yes answers ("has been on a plane"); go ask people.
- A link to answer the questions at home before the night.
