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
  - `talents.js`, `bluff.js`, `timeline.js`: one file per game. Each registers with `SW.game({...})`.
  - `data/bluff.js` (72 facts) and `data/timeline.js` (28 sets): Spark Wars' own questions. Talents uses Trivia Holy
    Party's questions for ages 9 and up (`../js/data.js`, `../js/data-modes.js`, `../js/more/l2.js` to `l7.js`).
  - `spark.css`, `index.html`. `../huddle/build.py` inlines it all into one page for the server.
  - The music is Trivia Holy Party's band (`../js/music.js`).

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

## The games

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
messages a second each way, well inside the server's limits (a TV may send 100 a second). Phones that drop out
rejoin on their own and pick up where they were. Tested with a TV, 3 real phones and 27 bot phones playing a whole
night (Talents, Bluff the Bible, Timeline): see `../huddle/server/test/spark.mjs` for the server side.
