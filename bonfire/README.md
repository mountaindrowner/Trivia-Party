# Bonfire Ice Breaker

A get-to-know-you night for up to 40 young adults, each on their own phone. No teams: everyone mixes. Everyone answers a few quick, fun
questions about themselves while the room fills up, then the show runs a string of mini-games built out of those
answers, and ends on the Campfire Report. The point isn't the score: by the end everyone knows a few surprising
things about people they didn't know before.

- **Play:** open `https://bonfire.thecrossroads.workers.dev/tv` on the TV or projector (a laptop is easiest) and
  click **Light the fire**. Everyone else goes to `bonfire.thecrossroads.workers.dev` on their phone, or scans the
  QR code, and types the 4-letter code.
- **Same bones as Spark Wars and Holy Huddle:** the room server and the phone page are in `../huddle/` (the
  `bonfire` room type allows 40 players and 20 in the audience).
- **Files:** `core.js` (the room, the questions while joining, the host's voice, the show and the Campfire Report),
  `games.js` (the four mini-games), `data/questions.js` (the library), `bonfire.css`, `index.html`.
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

Each game gets a title card in its own colour, read out loud, then plays a few rounds. The top 10 shows between
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

The device's own speech (the Web Speech API), so it can say names. It picks the best voice the device has: Edge's
"Natural" voices and the iPhone's "Enhanced" and "Premium" voices sound almost human; Chrome's "Google US
English" is fine. Everything it says is also captioned at the bottom of the TV. 🗣 in the lobby turns it off.
On an iPhone or iPad the sound starts after the first tap on the TV page.

## The look

A campfire at night: stars, a moon, pine trees and mountains, the fire flickering at the bottom with embers rising,
and a crackling fire sound. Shrikhand (a fat retro script) for the big words, Outfit for the rest. Each mini-game
has its own colour: orange for Who Said That?, blue for Read the Room, green for Kindred Spirits, purple for Two
Truths & a Lie. The phones match (`../huddle/phone/phone.css`, the `data-game="bonfire"` part).

## Ideas for later

- **Find Someone Who** (bingo): a 4×4 card of the room's own yes answers ("has been on a plane"); go ask people.
- A link to answer the questions at home before the night.
