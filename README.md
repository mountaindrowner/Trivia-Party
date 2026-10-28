# Trivia Holy Party

A single-player Bible trivia gauntlet for kids. Answer questions to keep your lamp lit, survive the
Trial Room minigames, and race Grumbles the Goat to the Narrow Gate. Your host is Barnabas the Donkey.

It plays on phones (touch) and TVs/desktops (arrow keys + Enter, or 1–4 to answer).

## Play

There's no build step. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's in the sketch

- 3 levels, listed easiest to hardest: **Little Lambs** (ages 5–8), **Mighty Warriors** (ages 9–12) and **Legends** (13+).
  Each mode's border gets grittier as the difficulty rises (`css/grit.css`).
- 8 questions per game from a bank of 385, each with a scripture reference and a lesson
- **Challenge Modes** with harder kinds of questions: Parable Pros (what Jesus' teachings mean, 64), Prophecy Hunters
  (promise → fulfillment, 60), Scholars (languages, places, history, 60), plus the secret **Holy of Holies** (61),
  unlocked by winning all six other modes
- Teaching built in: a lesson after every answer, an answer review after every game, and a "learned" count per mode
- 24 Trial Room minigames: Loaves & Fishes, Noah's Pairs, Walls of Jericho, David's Sling,
  Gideon's Fleece, Scroll Scramble, Find the Lost Sheep, Manna Catch, Red Sea Run, Build the Ark,
  Lions' Den Tiptoe, Fishers of People, Verse Builder, Joseph's Dreams, Soak the Altar, Jacob's Ladder,
  Scroll Sorter, Abraham's Stars, The Lost Coin, Hide the Spies, Paul's Shipwreck, Naaman's Seven Dips,
  In Order!, Don't Look Back
- **Versus mode**: pass-and-play for 2–4 players. Same challenge each round, different questions and a
  freshly shuffled minigame for every player, scoreboard after each round, double points in the final
- The Lost Sheep mechanic: lose all your oil and the Good Shepherd can still find you
- Final race, **The Narrow Gate**: "tap every one that fits" against Grumbles the Goat (50 prompts)
- Streak multiplier (x1.5, then x2 "ON FIRE"), slam-in stamps, cracked-glass hits
- Three skins, cycled on the title screen: **Victory Lobby** video-game lobby (`css/loot.css`, default, rarity colors and a
  kid-gamer host), **Neon City** cyberpunk (`css/cyber.css`) and **Holy Fire** esports (`css/edge.css`)
- XP, levels and ranks (Bronze → Champion) that build up across solo games
- Five synthesized jazz-funk tracks: Manna Groove, Jericho Jump, Red Sea Shuffle, Narrow Gate Breakdown and Hallelujah
  Strut. Each part of the game has its own, and the Jukebox on the title screen plays any of them. 🎵 toggles music,
  and 🔊 mutes everything.
- **Story Scenes**: animated Bible cartoon rewards, unlocked by winning games. Scene 1, *Giant Problem* (David and
  Goliath, 1 Samuel 17), unlocks on your first win. Watch it from the results screen or 🎬 Story Scenes on the title.
- Synthesized sound effects, responsive phone and TV layouts, best score saved on the device

All player-facing text has been through a content review and a two-pass fact check against the Bible text. See
[CONTENT-SAFETY.md](CONTENT-SAFETY.md) for the decisions, every fix, and notes for churches.

See [DESIGN.md](DESIGN.md) for the full game design, the mapping from *Trivia Murder Party*, the art direction, and the roadmap.

## Adding questions

Edit `js/data.js` (age levels) or `js/data-modes.js` (Challenge Modes). The first answer in `a` is the correct one (answers are shuffled when shown):

```js
{ lvl: 1, cat: "Noah's Ark", q: "Who built the ark?", a: ["Noah", "Abraham", "Adam", "Elijah"], ref: "Genesis 6:13–14", fact: "God told Noah exactly how big to build it." }
```
