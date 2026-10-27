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

Built in the prototype:

| # | Minigame | Story | Skill | TMP analogue |
|---|---|---|---|---|
| 1 | **Loaves & Fishes** | John 6 | Count (Lambs) or multiply baskets (Warriors), 3 in a row | Math |
| 2 | **Noah's Pairs** | Genesis 7 | Peek, then memory-match animal pairs | Memory |
| 3 | **Walls of Jericho** | Joshua 6 | Mash the trumpet 25 or 35 times in 7 s | Button mash |
| 4 | **David's Sling** | 1 Samuel 17 | Timing: release when the stone is on target | Timing |
| 5 | **Gideon's Fleece** | Judges 6 | Pure luck: 2 of 3 fleeces are wet | Chalices (poison cup) |
| 6 | **Scroll Scramble** | various | Spell a Bible name from mixed-up letters | Word / spelling |
| 7 | **Find the Lost Sheep** | Luke 15 | Spot the one sheep in a herd of goats | Spot-the-difference |

Backlog ideas:

- **Manna Catch** (Exodus 16): tilt or drag a basket to catch falling manna, dodge quail.
- **Red Sea Run** (Exodus 14): lane-runner between walls of water.
- **Build the Ark** (Genesis 6): stack beams quickly without the tower tipping.
- **Lion's Den Hush** (Daniel 6): stop tapping when a lion opens one eye (red light / green light).
- **Jonah's Big Fish Dodge**: steer a little boat through a storm.
- **Fishers of Men** (Luke 5): cast the net at the right moment for the biggest catch.
- **Blessing Wheel** (TMP2 "Wheel of Enormous Proportions"): bonus spin after a streak of 3.
- **Verse Builder**: tap the words of a memory verse in order.

---

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

### Holy Fire theme (current default, aimed at teens)

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
  4. Couch party mode: TV as the board, phones as controllers (the real TMP model), still with no accounts.
  5. Native wrappers (Capacitor) for app stores, and a Fire TV / Android TV build that maps the D-pad to arrows.

---

## 9. Milestones

| Milestone | Scope |
|---|---|
| **M0: Sketch** (this commit) | Full loop playable, 7 minigames, 2 levels, about 48 questions, 18 final prompts |
| M1: Content | 300+ questions reviewed by a children's ministry lead; fact cards with illustrations |
| M2: Polish | Character animation pass, voice lines, music loop, 4 more minigames, Blessing Wheel |
| M3: Ship | PWA/offline, read-aloud mode, parent page, app store builds |
| M4: Party | Multiplayer with phones as controllers |
