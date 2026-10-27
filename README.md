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

- 3 levels: **Legends** (13+), **Mighty Warriors** (ages 9–12) and **Little Lambs** (ages 5–8)
- 8 questions per game from a bank of 140 (48 / 48 / 44 per level), each with a scripture reference and a fun fact
- 14 Trial Room minigames: Loaves & Fishes, Noah's Pairs, Walls of Jericho, David's Sling,
  Gideon's Fleece, Scroll Scramble, Find the Lost Sheep, Manna Catch, Red Sea Run, Build the Ark,
  Lions' Den Tiptoe, Fishers of Men, Verse Builder, Joseph's Dreams
- The Lost Sheep mechanic: lose all your oil and the Good Shepherd can still find you
- Final race, **The Narrow Gate**: "tap every one that fits" against Grumbles the Goat (50 prompts)
- Streak multiplier (x1.5, then x2 "ON FIRE"), slam-in stamps, cracked-glass hits
- Holy Fire esports-style theme (`css/edge.css`), synthesized sound, responsive phone and TV layouts, best score saved on the device

See [DESIGN.md](DESIGN.md) for the full game design, the mapping from *Trivia Murder Party*, the art direction, and the roadmap.

## Adding questions

Edit `js/data.js`. The first answer in `a` is the correct one (answers are shuffled when shown):

```js
{ lvl: 1, cat: "Noah's Ark", q: "Who built the ark?", a: ["Noah", "Abraham", "Adam", "Elijah"], ref: "Genesis 6:13–14", fact: "God told Noah exactly how big to build it." }
```
