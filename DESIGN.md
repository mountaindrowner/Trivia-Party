# Trivia Holy Party: Game Design Sketch

A single-player Bible trivia gauntlet for kids, inspired by the structure of *Trivia Murder Party*:
answer questions, survive minigames when you miss, then win a final race. The spooky parts become
light, grace, and a goofy rival. It plays on a phone (touch) or a TV (arrow keys / remote + Enter).

---

## 1. Pillars

1. **Learn the stories by playing them.** Every question shows a scripture reference and a short fact
   after you answer. Every minigame is a Bible story you can play.
2. **Tension without fear.** You can lose progress, but you can't be eliminated. Losing your light
   turns you into a Lost Sheep, and the Good Shepherd always comes looking.
3. **Fast, loud, and colorful.** Short rounds, big buttons, confetti, a host who never stops talking.
4. **Kid-safe by design.** No violence beyond "the walls fell down" and "the giant tipped over", no
   ads, no accounts, no chat, no data leaves the device.

---

## 2. How Trivia Murder Party maps over

| Trivia Murder Party | Trivia Holy Party | Why it fits |
|---|---|---|
| Creepy skeleton host | **Barnabas the Donkey**, an over-excited host | Balaam's donkey talked; Jesus rode a donkey. "Barnabas" means "son of encouragement." |
| The Killer's hotel | **The Gauntlet / The Narrow Road** | Matthew 7:14 |
| Getting killed | **Your lamp oil spills** (3 drops) | Parable of the ten virgins, Matthew 25:1–13 |
| Becoming a ghost | **Becoming a Lost Sheep** | Luke 15:4–7 |
| Ghosts can come back to life | **The Shepherd finds you**: get one right and your lamp is relit | Grace, not elimination |
| The Killing Floor | **The Trial Room** | James 1:2–3, "trials produce perseverance" |
| Final round: escape the hotel | **The Narrow Gate**: race Grumbles the Goat | Phil 2:14, "do everything without grumbling" |
| Money ($) | **Talents** | Parable of the talents, Matthew 25:14–30 |

---

## 3. Core loop (one game is about 8 to 10 minutes)

```
Title → pick level (Little Lambs 5–8 / Mighty Warriors 9–12)
  └─ Barnabas intro
  └─ 8 × Question
        ├─ correct → +500 to +1000 talents (speed bonus), fact card
        │            (if Lost Sheep → FOUND! lamp relit with 1 oil)
        └─ wrong / timeout → THE TRIAL ROOM
               ├─ roulette picks a minigame (no repeats among the last 3)
               ├─ win  → +250 talents, oil is safe (if Lost Sheep → FOUND!)
               └─ lose → −1 oil; at 0 oil → LOST SHEEP
  └─ THE NARROW GATE (final race)
        ├─ start position = oil left (Lost Sheep start at 0)
        ├─ each turn: "Tap every X" with 3 choices (1–3 are right)
        │     +1 step per right tap, −1 per wrong tap, missed answers flash
        ├─ Grumbles moves 1–2 steps per turn
        └─ first to step 10 wins (+2000 talents if you do)
  └─ Results: score, stats, best score, encouraging verse
```

### Difficulty levels

| | Little Lambs (5–8) | Mighty Warriors (9–12) |
|---|---|---|
| Question timer | 20 s | 15 s |  
| Final round timer | 16 s | 12 s |
| Question pool | mostly well-known stories | names, places, books, numbers |
| Minigames | slower, more forgiving | faster, tighter windows |
| Goat double-step chance | 25% | 50% |

Each game takes 6 questions from your level and 2 from the other, so Lambs get a stretch and Warriors get a breather.

---

## 4. The Trial Room: minigames

Built in the prototype (24):

| # | Minigame | Story | Skill | TMP analogue |
|---|---|---|---|---|
| 1 | **Loaves & Fishes** | John 6 | Count (Lambs) or multiply baskets (Warriors), 3 in a row | Math |
| 2 | **Noah's Pairs** | Genesis 7 | Peek, then memory-match animal pairs | Memory |
| 3 | **Walls of Jericho** | Joshua 6 | Mash the trumpet 25 or 35 times in 7 s | Button mash |
| 4 | **David's Sling** | 1 Samuel 17 | Timing: release when the stone is on target | Timing |
| 5 | **Gideon's Fleece** | Judges 6 | Pure luck: 2 of 3 fleeces are wet | Chalices (poison cup) |
| 6 | **Scroll Scramble** | various | Spell a Bible name from mixed-up letters (16 names per age group) | Word / spelling |
| 7 | **Find the Lost Sheep** | Luke 15 | Spot the one sheep in a herd of goats | Spot-the-difference |
| 8 | **Manna Catch** | Exodus 16 | Steer a basket to catch manna, dodge the wormy leftovers | Catch |
| 9 | **Red Sea Run** | Exodus 14 | Switch lanes to dodge waves for 12 s | Dodge / survive |
| 10 | **Build the Ark** | Genesis 6 | Drop sliding beams; overhang gets trimmed (stacker) | Timing |
| 11 | **Lions' Den Tiptoe** | Daniel 6 | Step while the lion sleeps, freeze when it wakes | Red light, green light |
| 12 | **Fishers of People** | John 21 | Whack-a-fish, avoid old boots | Reflex |
| 13 | **Verse Builder** | various | Tap memory-verse words in order (12 verses) | Word order |
| 14 | **Joseph's Dreams** | Genesis 37 | Repeat a growing sun/moon/star/wheat pattern | Simon says |
| 15 | **Soak the Altar** | 1 Kings 18 | Hold to pour, release inside the gold band, 3 jars | Hold and release |
| 16 | **Jacob's Ladder** | Genesis 28 | Alternate left/right taps to climb; same hand twice slips | Alternating mash |
| 17 | **Scroll Sorter** | 2 Timothy 3 | Old Testament or New? Sort books against the clock | Sorting |
| 18 | **Abraham's Stars** | Genesis 15 | Stars flash for a moment, pick how many | Flash count |
| 19 | **The Lost Coin** | Luke 15 | Sweep tiles; each shows distance to the coin (hot/cold deduction) | Deduction |
| 20 | **Hide the Spies** | Joshua 2 | Follow the bundle hiding the spy through a shuffle | Shell game |
| 21 | **Paul's Shipwreck** | Acts 27 | Lean against gusts to keep the ship from capsizing for 12 s | Balance |
| 22 | **Naaman's Seven Dips** | 2 Kings 5 | Tap when the ring closes, 7 times | Rhythm |
| 23 | **In Order!** | Genesis 1 and more | Creation days, books of the Law, first Gospels, first plagues in order | Sequencing |
| 24 | **Don't Look Back** | Genesis 19 | Tap RUN wherever it appears, never LOOK BACK | Go / no-go |

Every minigame also reports a score through `THP.mgScore(won)`: a win earns 1,000 plus up to 500 for time left, and a loss earns up to 700 for progress. Single-player only uses win/lose; Versus uses the score.

Backlog ideas:

- **Jonah's Big Fish Dodge**: steer a little boat through a storm.
- **Blessing Wheel** (TMP2 "Wheel of Enormous Proportions"): bonus spin after a streak of 3.

---

## 4a. Challenge Modes and the secret mode

Opened from the "Challenge Modes" card on the title screen. Each one asks a harder *kind* of question, gets a
longer timer for longer questions, has its own opening briefing from Barnabas, and draws only from its own pool:

| Mode | Questions | What it asks | Timer |
|---|---|---|---|
| **Parable Pros** (10+) | 64 | What Jesus' stories and teachings *mean*: parables, Sermon on the Mount, "I am" sayings | 22 s |
| **Prophecy Hunters** (12+) | 60 | Old Testament promise → New Testament fulfillment, shadows and pictures of Jesus, the prophets | 22 s |
| **Scholars** (14+) | 60 | Bible languages, places, empires, feasts, tabernacle and temple, authors, how the Bible came to us | 18 s |
| **Holy of Holies** (secret) | 61 | Kings of Judah, numbers, name meanings, family trees, prophets' signs, early church, deep doctrine | 15 s |

**Unlocking:** win the Narrow Gate once in each of the six other modes (Lambs, Warriors, Legends and the three
above). Progress shows on the locked card and on the title ("secret mode 3/6"). The results screen shows
"✓ Parable Pros beaten! 4/6", and the game that completes the set shows an UNLOCKED banner with "Enter now". The name
comes from the inner room of the tabernacle, which only the high priest entered once a year, until the curtain tore
when Jesus died (Matthew 27:51; Hebrews 10:19–20).

**Teaching:**
- Every Challenge Mode answer is followed by a lesson that explains *why*, not just *what*.
- After every game (any mode), **Review answers** lists all 8 questions, misses first, with the right answer, what you
  picked, the verse and the lesson.
- Each mode card shows **Learned x/y**: how many of that pool's questions you've answered right at least once.
  Games pick questions you haven't learned yet first, so repeat players keep meeting new material.
- 10 more hard Narrow Gate prompts (prophecies, "I am" sayings, feasts, empires, prison letters...).

Content totals: **385 questions** (48 / 48 / 44 / 64 / 60 / 60 / 61) and 60 final-round prompts.

## 4b. Versus mode (pass & play)

- 2–4 players on one device, with a name and color each. Pick a level (Lambs / Warriors / Legends) and 3, 5 or 7 rounds.
- Rounds alternate: **Trivia Blitz** (3 questions each, all different, drawn without repeats across the match) and
  **Trial Room** (a roulette picks one minigame and everyone plays it; it reshuffles for each player).
- A "Pass to {name}, no peeking!" screen sits between turns. The first player rotates each round so nobody always sets the bar.
- Scores: trivia uses the normal speed + streak scoring; minigames use `THP.mgScore` ×2 so the two round types weigh about the same.
  The last round is worth double.
- After each round there's a scoreboard with round winner crowns, bars and shared ranks for ties; at the end a champion
  screen with Rematch / Change players / Title.
- Code: `js/versus.js`, using `THP.game.askQuestion` and `THP.game.runMinigame` from `js/game.js`.

## 5. Characters

- **Barnabas the Donkey (host).** Gray, pink ears, red-and-gold scarf. Cheerful, punny, never mean.
  Two moods (happy and worried) shown through his brows and ears, a talking mouth, and blinks.
  He gets ridiculously excited whenever the answer is "donkey."
- **Grumbles the Goat (rival).** Only appears in the final race. Complains constantly, isn't evil, just grumpy.
- **You, the lamb.** Your token is a sheep. Once your lamp goes out, you're the lost one.

Future: Barnabas voice lines (recorded or text-to-speech), more moods (surprised, cheering), and
"Barnabas cams" between rounds.

---

## 6. Art direction: "stained glass at a midnight party"

- **Palette:** deep indigo night sky with a sunrise glowing from the bottom of the screen, slowly
  rotating light rays, and jewel tones (ruby, sapphire, emerald, amber, violet) for the answer buttons.
- **Shape language:** thick dark ink outlines and hard drop shadows, like the lead in stained glass and
  a cartoon game show. Parchment cards for questions and scripture.
- **Type:** Lilita One (chunky display) for the show, Nunito (rounded, readable) for everything else.
- **Each answer has a color and a shape** (◆ ● ▲ ★), so it isn't color-only. The answers move around every time.
- **Juice:** confetti on correct answers, screen shake on wrong ones, floating "+850" score pops,
  animated lamp flames in the HUD, a 3-2-1 countdown before every trial, and a roulette that picks the trial.
- **Sound:** synthesized with Web Audio, so there are no audio files. There's a mute toggle and the setting is remembered.

### Victory Lobby skin (current default, preteen gamer)

`css/loot.css`, layered over Holy Fire like Neon City. A bright video-game lobby: daylight-blue sky with drifting clouds,
a spinning starburst and a purple storm pulsing in at the edges; chunky slanted cards with a bevel; loot-rarity colors
(uncommon green, rare blue, epic purple, legendary orange) for answers, level cards and stats; a big yellow PLAY-style
button; Anton italic poster type with Exo 2 for reading. Barnabas wears a sideways cap with a cross on it. The Trial
Room is "the storm" (purple and white tape). Right answers stamp a rarity by speed (UNCOMMON → LEGENDARY).
Voice: `THP.LINES_LOOT` / `THP.VS_LINES_LOOT`, a hyped kid-gamer Barnabas ("SHEEESH!", "That's a dub!", "Bro went AFK!").

The skin button on the title cycles Victory Lobby → Neon City → Holy Fire (remembered per device).

### XP and ranks (all skins)

Solo games award XP: 50 per match, 100 per right answer, 75 per trial passed, 25 per streak step, 300 for beating
Grumbles. Level n needs 500 + 100·(n−1) XP. Ranks: Bronze (1), Silver (5), Gold (10), Platinum (15), Diamond (20),
Champion (30). A typical game is ~1,000 XP, so Silver comes around game 3 and Champion around game 50. The title shows
the player card; results show the XP breakdown, an animated bar and a LEVEL UP / rank-up stamp. Saved on the device only.

### Neon City skin (cyberpunk, preteen voice)

`css/cyber.css` sits on top of Holy Fire and is switched from the title screen ("Skin: Neon City / Holy Fire"; remembered
on the device). Rainy night skyline generated on load (lit windows, neon signs, blinking antennas, one tower carrying
a flickering neon cross), a scrolling perspective grid floor, scanlines, glass HUD panels with corner brackets,
chromatic-glitch headlines, and Barnabas as a hologram (BARNABAS.EXE) in a magenta visor. Type: Oxanium (display),
Rajdhani (body), Share Tech Mono (labels). Questions stay in sentence case so they read easily.

Voice: with Neon City on, Lambs and Warriors hear `THP.LINES_CYBER` and Versus uses `THP.VS_LINES_CYBER`, a cool,
techy preteen Barnabas ("Access granted!", "Error 404: right answer not found.", "Lag spike! Too slow."). Legends keep
the teen announcer.

### Holy Fire theme (aimed at teens)

`css/edge.css` layers an esports-arena look on top of the base style: a black arena with rising embers, a fire
glow and a vignette, cut-corner steel panels with colored edges, a flame-gradient "HOLY" logo, condensed
display type (Teko) with techy body type (Chakra Petch), glitch flickers, and hazard tape in the Trial Room.
Gameplay juice to match: slam-in stamps ("NAILED IT", "CLUTCH", "TOO SLOW"), cracked glass when oil spills,
an "ON FIRE" streak badge, and heavier bass-hit sound effects. Barnabas wears shades that slide down when he's
worried. Delete the stylesheet's `<link>` in `index.html` to go back to the softer stained-glass look.

### Legends level (13+)

- 12 s question timer, 10 s final round, goat double-steps 60% of the time.
- Deep-cut questions (Ehud, Eutychus, Melchizedek, Malta, Belshazzar...) plus 7 harder final-round prompts.
- Barnabas switches to a hype-announcer voice (`THP.LINES_TEEN`).
- **Streaks:** 2 in a row = x1.5 points, 3+ = x2 and "ON FIRE". A miss resets it. These apply on every level.

### Phone vs TV

- **Phone (portrait):** HUD, then a compact Barnabas strip, then the stage. Answers stack in one column below 420 px.
- **TV / landscape / desktop:** Barnabas gets a big left column with the bubble above him; the stage is on the right.
- **TV remote:** arrow keys do spatial navigation between buttons, Enter selects, and keys 1–4 answer directly.
  The first control is auto-focused on every screen. Root font size scales with the viewport, so 10 feet away still reads.

---

## 7. Content guidelines

- Questions come straight from the text, and each one carries a **reference** that someone has checked.
- Translation-neutral wording (it works with NIV, ESV, NIrV, CSB, and KJV readers).
- Avoid denominationally contested trivia (canon counts beyond the 27 New Testament books, dates, theology debates).
- Distractors can be silly for Lambs ("Pizza") but plausible for Warriors.
- Each item: `{ lvl, cat, q, a: [correct, ...wrong], ref, fact, host? }`. Final-round items: `{ p, opts: [[label, isRight]] }`.
- Current pool: 385 questions (48 Lambs, 48 Warriors, 44 Legends, 64 Parable Pros, 60 Prophecy Hunters, 60 Scholars,
  61 Holy of Holies), 60 final-round prompts (24 hard-only),
  32 scramble names, 12 memory verses, about 135 host lines, 10 results-screen verses.
- Target for v1: about 150 questions per level and about 60 final-round prompts.

---

## 8. Tech plan

- **Now (prototype):** plain HTML, CSS, and JavaScript with no build step and no dependencies. Open `index.html`
  or host the folder anywhere (GitHub Pages works). Scripts are classic (not modules), so the game even runs from `file://`.
  - `js/data.js`: questions, final prompts, host lines, verses
  - `js/audio.js`: synthesized sound effects
  - `js/core.js`: DOM helpers, host speech, timers, confetti, TV-remote navigation
  - `js/minigames.js`: Trial Room games (each is `play(container, level) → Promise<boolean>`)
  - `js/game.js`: the game flow
- The best score, name, and mute setting live in `localStorage`. Nothing else is stored, and nothing is sent anywhere.
- **Next:**
  1. PWA manifest + service worker → install to home screen, play offline.
  2. Content pipeline: questions in JSON/CSV so teachers and parents can add packs ("Christmas pack", "Easter pack", curriculum tie-ins).
  3. Accessibility pass: read-aloud mode (Web Speech API) for pre-readers, high-contrast option, longer-timer option.
  4. Couch party mode: TV as the board, phones as controllers (the real TMP model), still with no accounts. Pass-and-play Versus is the first step.
  5. Native wrappers (Capacitor) for app stores, and a Fire TV / Android TV build that maps the D-pad to arrows.

---

## 9. Milestones

| Milestone | Scope |
|---|---|
| **M0: Sketch** (done) | Full loop playable, 24 minigames, 3 levels, 140 questions, 50 final prompts, pass-and-play Versus |
| M1: Content | 300+ questions reviewed by a children's ministry lead; fact cards with illustrations |
| M2: Polish | Character animation pass, voice lines, music loop, 4 more minigames, Blessing Wheel |
| M3: Ship | PWA/offline, read-aloud mode, parent page, app store builds |
| M4: Party | Multiplayer with phones as controllers |
