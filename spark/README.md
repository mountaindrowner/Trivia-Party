# Spark Wars

The youth group game night: up to 30 players, each on their own phone, in teams that stay together all night.
Made for Church of the Crossroads' middle school group; Trivia Holy Party (the rest of this repo) stays the kids'
and family game.

- **Play:** open `https://sparkwars.thecrossroads.workers.dev/tv` on the TV or projector (a laptop is easiest: the
  leader runs it with the mouse). Click **Open a room**. Everyone else goes to `sparkwars.thecrossroads.workers.dev`
  on their phone, or scans the QR code, and types the 4-letter code.
- **Same bones as Holy Huddle:** the room server and the phone page are in `../huddle/` (one code for both games).
- **Files:**
  - `core.js`: the room, lobby, teams and War Points, rules screens, countdowns, scoreboards, results, and the
    effects (sparks, confetti, callouts, shakes, sliding boards, music).
  - `lightning.js`, `talents.js`, `bluff.js`, `timeline.js`: one file per game. Each registers with `SW.game({...})`.
  - `lessons.js`: Spark's curriculum for any game that asks questions (pick a lesson and a mix).
  - `data/bluff.js` (72 facts) and `data/timeline.js` (28 sets): Spark Wars' own questions. Talents uses Trivia Holy
    Party's questions for ages 9 and up (`../js/data.js`, `../js/data-modes.js`, `../js/more/l2.js` to `l7.js`).
  - `spark.css`, `index.html`. `../huddle/build.py` inlines it all into one page for the server.
- **The look: Sticker.** Bricolage Grotesque (Google Fonts) for everything, an electric-violet dotted background,
  chunky black outlines with offset shadows, and yellow for what matters (the code, the start button, scores). The
  phones match (`../huddle/phone/phone.css`, the `data-game="spark"` part). Everything on the TV is drawn from the
  tokens at the top of `spark.css`; an alternate look, **Arena** (Anton + Space Grotesk, black and orange, sharp
  and sporty), is kept for trying: open `/tv?look=arena` (and `/tv?look=sticker` to switch back).
- **Each game has its own look** (like a Jackbox pack: same bones, a different world per game). While a game runs,
  `<html data-theme="...">` switches the TV (`themes/<game>.css`) and every phone (`../huddle/phone/themes.css`); the
  lobby stays Sticker, and its game cards show each game's look. Big headings are split into letters so a look can
  tilt, bounce or float them; each look draws its own props (curtains, clouds, coins) on 16 empty `.decor i`
  elements behind the stage, and picks its own confetti (`--fx-colors`, `--fx-bits`: bolts, coins, stars, paper).
  - **⚡ Lightning Round: Storm Arcade.** A neon arcade cabinet in a thunderstorm: Monoton and Bungee, everything
    leaning forward, scanlines, red/blue colour split, a synthwave floor, the sky flashing now and then.
  - **💰 Talents: The Vault.** A cartoon jackpot vault: emerald green, gold rays turning behind everything, coins
    flipping in the air, marquee bulbs chasing round the clock, starburst callouts, glass jars with lids, a giant
    flipping coin for 3-2-1, gold bars on the podium, coins for confetti. Luckiest Guy and Baloo 2.
  - **🎭 Bluff the Bible: The Illusion.** A magic show: velvet curtains, spotlights sweeping the stage, the fact on
    a gilded placard, answers dealt out as a fan of playing cards, each fake vanishing in a puff of smoke, the truth
    on a gold banner. Big words float. Ultra and Fredoka.
  - **🧭 Timeline: The Express.** A bright cartoon day: sun, drifting clouds, green hills. Every card on the line is
    a carriage coupled on a track, the new card puffs in as the engine, and the podium is three carriages. Titan
    One and Nunito.
  - A new game picks a world that fits what the game is about (bright, cartoony, with props framing the content,
    not flat paper), then writes `themes/<key>.css` and its part of `huddle/phone/themes.css`.
- **The lobby:** each setting is one pill (Teams 3, Time 5 min, Steals On, Questions Bible Mix); tap to change it.
  Shuffle, lock, sound and end are small round buttons.
  - The music is Trivia Holy Party's band (`../js/music.js`).

## The host: Barnabas

Trivia Holy Party's donkey hosts here too, in his cap and shades, drawn in the Sticker colors (`<template
id="barnabas">` in `index.html`, styles at the end of `spark.css`). He stands in a corner and talks in a bubble:

- **Where:** at the bottom of the join column in the lobby; bottom left on the title, rules and results screens;
  during play he pops in to say something and ducks back out, so he never covers the game for long.
- **What:** all his lines are in `host-lines.js` (snarky, never mean, never about faith): hellos as players join (or "A whole crowd just walked in" when
  lots arrive at once), each game's rules, Double Time, lead changes, jackpots, steals and swaps, Bluff reveals,
  Timeline streaks, the winner, and the War Points leader back in the lobby. Small lines are skipped when he's
  already talking.
- **His voice:** recorded lines (Chatterbox, an open-source voice model, in a voice picked by ear: see `voice/README.md`),
  bundled into the Spark Wars server at `/voice/clips/` (huddle/build.py) and listed in `voice/voice.js`. Lines with a player's name or a number in them say a
  general version out loud ("Team Volt, meet your newest player") while the bubble shows the name. If a clip is
  missing, he falls back to the device's own voice. 🗣 in the lobby turns his voice off.
- **His face follows his voice:** while a clip plays, its loudness opens his mouth, bobs and tilts his head, and
  flicks his ears and brows on the loud bits; the bubble types out at the pace he talks, so the words finish with
  the sound.

## A night of Spark Wars

- **The lobby:** the QR code, the join address and the code, and 30 seats that fill as phones join (a burst of
  sparks for each). Click a player twice to remove them. **Lock** stops new joins. Past 30, phones watch from the
  audience. The first player in is the VIP 👑: they can start a game, skip the rules and pick **Play again** from
  their phone.
- **Teams:** off, 2, 3 or 4 (Volt ⚡, Blaze 🔥, Surge 🌊, Nova ✨). Everyone is shuffled into even teams for the night;
  **🔀 Shuffle teams** makes new ones, and late joiners go to the smallest team. A team's score is its players' scores
  added up, evened out if one team has fewer players.
- **The war:** every game gives the teams War Points (3 for first, then 2, 1, 0). The standings show in the lobby
  and at the end of every game.
- **Each game:** a rules screen that builds up step by step (the VIP can skip it), a 3-2-1 countdown, the game, a
  "TIME!" slam, then results: the winning team, a podium that rises, awards, War Points, and **Play again** or
  **Pick another game**.
- Settings are saved on that computer (`sparkwars-prefs`).

## Spark's curriculum: "The Church Is Here"

Spark Sunday teaches *The Church Is Here*, a 40-lesson middle school New Testament curriculum (Acts through
Revelation, ESV; 30 minutes of teaching paired with 30 minutes of games). Its theme: **"The resurrection life begins
now."** Every lesson has a passage, a Gospel Anchor (one sentence tying it to the good news of Jesus), a discussion
question and a game idea; every book has a "unique angle" so books don't repeat each other.

| Lessons | Book | | Lessons | Book |
| --- | --- | --- | --- | --- |
| 1–6 | Acts | | 25 | 1 & 2 Timothy + Titus |
| 7–9 | Romans | | 26 | Philemon + Jude |
| 10–12 | 1 Corinthians | | 27–29 | Hebrews |
| 13–14 | 2 Corinthians | | 30–32 | James |
| 15–16 | Galatians | | 33–35 | 1 Peter |
| 17–19 | Ephesians | | 36 | 2 Peter |
| 20–21 | Philippians | | 37 | 1, 2 & 3 John |
| 22–23 | Colossians | | 38–40 | Revelation |
| 24 | 1 & 2 Thessalonians | | | |

`data/lessons/` has 15 questions for each lesson (on the passage, its context, and what it means), written from the
curriculum and checked against the ESV, with the lesson's Gospel Anchor. Questions follow the ESV here (the rest of
Trivia Holy Party uses the NIV).

**In the Lightning Round** (made for this) and **in Talents** (Questions → Spark lessons): pick the **Lesson**
(◀ ▶ through all 40) and the **Mix**:

- **This week:** that lesson's questions first, then earlier lessons from the same book, so nothing repeats too soon.
- **Whole book:** every lesson in that book, up to this one (review).
- **All so far:** lessons 1 through this one, this lesson first.

The results screen ends on the lesson's Gospel Anchor.

## The games

### ⚡ Lightning Round (this week's lesson)

Head to head: everyone gets the same question at the same time, from Spark's curriculum (8, 10, 12 or 15
questions; 15, 20 or 30 seconds each). A right answer scores 500 to 1,000 points (quicker is more), plus 100 for each
answer in a row after the first (up to 500); the last question is worth double. The TV shows the four answers in
the same colors and shapes as the phones, faces popping up as players lock in; then the answer, how many picked
each option, the fastest player and the verse; then the scoreboard, with movers sliding up. Awards: most right,
quickest on average, longest streak. It ends on the lesson's Gospel Anchor.

**At tables** (Tables: 2 to 6): the TV scrambles everyone into random tables, with every name flying around the
screen before landing at its table, and every phone shows a big "Your table: 3" in that table's color. The room
moves; the leader clicks **Everyone's seated** (or the VIP taps it on their phone, or it goes on by itself after 30
seconds). Then each table talks it over and everyone still locks in on their own phone. A table scores the average
of its players' points (so a table of 4 and a table of 6 are even), plus 200 when the whole table gets it right (a
sweep). The TV shows how many at each table have locked in, then each table's points; the scoreboard and the podium
are the tables'. Late joiners go to the smallest table. Everyone's own points still count for their team's War
Points.

### 💰 Talents (Matthew 25:14–30)

Everyone answers at their own pace for 3, 5, 7 or 10 minutes, from a question pack (Bible Mix, Bible Basics,
Legends, Jesus' Teaching, Prophecy, Scholars, Holy of Holies). Wrong: the phone shows the right answer and its verse.
Right: pick 1 of 3 jars:

- **+10, +20, +30, +50 or +100** talents
- **✨ Well done! ×2**, **🕳️ Buried** (nothing), **🦋 Moths & rust** (lose 25%)
- **🎁 Cheerful giver**: give 20 to the last player on your team and get 40 back
- With steals on: **🧾 Tax collector** (take 25% from a top player on another team) and **🔄 Swap** (trade all your
  talents with someone on another team who has more)

The last minute is **⚡ Double Time**. On the TV: the clock, team bars (👑 on the leader), the top 10 sliding past
each other, a live feed, and callouts for jackpots, big doubles, steals, swaps, streaks of 5 and 10, a new #1 and
lead changes. The last 10 seconds turn red and shake.

### 🎭 Bluff the Bible

4, 6 or 8 strange-but-true facts with a blank (`data/bluff.js`). Everyone types a fake answer that sounds real
(or taps **🎲 Lie for me**); typing the real answer by accident asks for a fake instead. Then the fakes and the truth
are mixed on the TV and everyone picks the real one on their phone (never their own fake).

- **Scoring:** the truth +1,000; every player your fake fools +500 for you. The second half is ×2, the last fact ×3.
- **30 players:** 10 write each fact (everyone takes turns evenly) and the rest are detectives that round.
- **The reveal:** each fake that fooled someone gets its turn: who fell for it, a FAKE! stamp and who wrote it. Then
  THE TRUTH, the verse, and confetti for whoever found it. Then the scoreboard, where the new points count up and
  the movers slide.
- **Keeping it clean:** typing is checked by the server before the TV ever sees it (the same filter as names; no
  emoji), and the leader can click any answer twice on the TV to hide it.
- Awards: best bluffer, truth detector, and the biggest bluff of the night.

### 🧭 Timeline

2, 3 or 4 sets (`data/timeline.js`: Bible events, people and books with an order that's certain from the text),
at a level of Mixed, Easy, Medium or Hard. The first card goes on the line; each new card is dealt and everyone taps
where it goes, with 15 seconds a card. Right: +500, up to +500 more for speed, and +100 for each card in your streak.
The card then lands in its real place for everyone. Faces pop up on the TV as phones lock in. After each set, the
whole line with its Bible references, and the scoreboard. Awards: most right, longest streak, fastest right answer,
and perfect sets.

## How it scales

The TV sends each phone its next screen as soon as it answers, so 30 players at their own pace is about 15
messages a second each way, well inside the server's limits (a TV may send 40 a second, in bursts of 400). Phones that drop out
rejoin on their own and pick up where they were. Tested with a TV, 3 real phones and 27 bot phones playing a whole
night (Talents, Bluff the Bible, Timeline): see `../huddle/server/test/spark.mjs` for the server side.
