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

Content totals: **1,150 questions** (144 / 142 / 131 / 191 / 180 / 179 / 183) and 180 final-round prompts.

## 4c. Daily Challenge

- **What it is:** 5 questions and 1 minigame at the player's age level (Lambs, Warriors or Legends), the same for
  everyone that day, so friends and siblings can compare scores.
- **Picking questions:** a seeded shuffle of the level's pool, dealt 5 a day, so no question repeats until the whole
  pool has been used. A new shuffle starts each lap.
- **Streak:** 🔥 grows by one for each day in a row. The daily screen and results show a 7-day check row.
- **XP:** 50, plus 40 per right answer, plus 75 for passing the trial, plus a streak bonus of 20 × days (up to 10 days).
- **Replays** the same day are practice only: no XP, and the streak doesn't change.
- **Title screen:** the first button under the player card shows "🌅 Daily Challenge · NEW" or "✓ Daily done · 🔥 3".
- **Code:** `js/daily.js`, stored as `thp-daily`.

## 4d. Holiday Rush

Six minigames back to back with three lives: lose a trial, lose a life.

| Event | Featured | Trials |
|---|---|---|
| 🌾 Thanksgiving Rush | All of November | The One Who Came Back (Luke 17), Goodbye Grumbles!, Loaves & Fishes, Verse Builder with thank-you verses, then the two new ones again on hard |
| 🎄 Christmas Rush | Dec 1 – Jan 6 (Epiphany) | Follow the Star (Matthew 2:9), Gifts for the King (Matthew 2:11), In Order! with the Christmas story, Verse Builder with Christmas verses, then the two new ones on hard |

- **In season:** the event is featured on the title (LIVE badge) and earns double XP.
- **The rest of the year:** Holiday Rush is hidden. The title shows the 🎉 button only while an event is live.
- **Coming soon:** in the 14 days before an event opens, the title shows a notice ("🎄 Christmas Rush starts in
  5 days! December 1 · Six Christmas trials and double XP"). The ✕ dismisses it until that event's next year, saved as
  `thp-notice-<event>-<year>`. On TV layouts the notice shrinks to one line and takes the tagline's place.
- **Overlap:** from mid-November, Thanksgiving is live while the Christmas notice counts down. Both can show at once.
- **Effects:** leaves or snow fall during a Rush.
- **Records:** best scores are kept per event (`thp-rush-thanksgiving`, `thp-rush-christmas`).
- **The four holiday minigames:**
  - *The One Who Came Back:* tap the healed man who turns back to say thanks.
  - *Goodbye, Grumbles!:* sort thankful from grumbly.
  - *Follow the Star:* keep the camel under the moving star.
  - *Gifts for the King:* tap only gold, frankincense and myrrh.
- **Where they live:** the holiday games are in `js/holiday.js`, outside `THP.MINIGAMES`, so the regular Trial Room
  and Versus don't change. They share `THP.mgFrame`, `THP.mgProg` and `THP.mgScore` with the other games.
  Verse Builder and In Order! read `THP.mgTheme` for holiday lists.

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

### Soundtrack: five jazz-funk tracks

`js/music.js` plays live-synthesized music through the same AudioContext as the sound effects, at a level that sits
under them. A lookahead scheduler runs a swung 16th-note grid. The band:
- **Drums:** kick, snare with ghost notes, closed/open hats, ride, clap.
- **Bass:** a filtered saw-and-sub bass that walks the chords with approach notes and dead-note "slaps."
- **Keys and comping:** FM Rhodes, clav, a tonewheel-style organ.
- **Melody:** a brass section and a square-wave lead.

Arrangement:
- The first pass has no melody.
- Every other pass ends in a snare fill.
- Every fourth pass is a drums-and-bass breakdown.
- A generated room reverb and a compressor glue it together.

| # | Track | Feel | Plays during |
|---|---|---|---|
| 1 | Manna Groove | 98 bpm D Dorian, Dm9–G13 vamp, clav and flute-ish lead | Title, menus, How to play, review |
| 2 | Jericho Jump | 152 bpm triplet swing, F major ii–V, walking bass and trumpets | Questions, Versus pass screen |
| 3 | Red Sea Shuffle | 126 bpm 12-bar A-minor blues shuffle on the organ | Trial Room, countdown, minigames |
| 4 | Narrow Gate Breakdown | 116 bpm E-minor 16th-note funk, clav and horn hits | The final race |
| 5 | Hallelujah Strut | 104 bpm Bb I–vi–ii–V strut with a horn hook | Results, scoreboards, champion |

Behavior:
- **Switching:** each screen picks its track in `THP.ui.show()` by the screen's class, and a change crossfades.
- **Starting:** music begins on the first tap or key press, because browsers block sound before that.
- **Pausing:** it pauses while the tab is hidden.
- **Controls:**
  - 🔊 mutes everything.
  - 🎵 in the HUD turns music alone on or off (saved as `thp-music`).
  - The title's **🎵 Music** button opens the Jukebox, which lists all five tracks to play.

### Story Scenes (rewards)

Short animated cartoons of Bible stories, earned at milestones, each drawn in its own art style.

| Scene | Unlocks at | About when (≈1,000 XP per solo game) | Style |
|---|---|---|---|
| 1 Giant Problem | First win | Game 1–2 | Saturday-morning cartoon |
| 2 Wrong Way, Jonah | Level 6 | Game 4 | Paper cut-out |
| 3 Lions on Mute | Level 10 | Game 8 | 8-bit pixel art |
| 4 Two by Two | Level 14 | Game 14 | Clay stop-motion |
| 5 Fire on the Mountain | Level 18 | Game 22 | Crayon drawing |
| 6 He Is Risen | Level 22 | Game 32 | Stained glass |

They come quickly at first to hook a new player, then spread out. Daily Challenges and Holiday Rushes also earn
XP, so they count toward the milestones too.

- **Results screen:** a newly unlocked scene gets a fanfare, a "NEW SCENE!" stamp and a banner with Watch now.
  The XP card always shows the distance to the next one ("1,250 XP to Level 6").
- **Gallery:** the title's 🎬 Story Scenes button opens it. Locked cards show their milestone and art style.
- **Storage:** wins are saved as `thp-wins`, and scenes already announced as `thp-scenes-seen`.

- **Built in `js/scenes.js` and `css/scenes.css`,** with Scenes 2–6 in their own files: `js/stories/<story>.js`
  registers a scene with `THP.Scenes.define(id, {...})`, and `css/stories/<story>.css` restyles the whole player
  (frame, caption, bubbles, bursts, title and end cards) under `.scene-player.theme-<style>`. Characters and backgrounds are inline SVG. A small director drives
  them with the Web Animations API: actors that walk, a camera that pans and zooms, typed narration, speech bubbles,
  comic bursts, screen shake, slow motion and speed lines. The soundtrack switches tracks during the scene.
- **Reading pace:** slow, for young readers, and it plays like a cartoon with no tapping needed. Every line of
  narration and dialogue types out, then stays up for a reading time based on its length (1.2 s + 65 ms a letter),
  and the next line waits until it has been read.
- **Controls:** tap the picture or the caption (or Space/Enter) to show the rest of a line that is still typing; the
  cartoon then carries on by itself. Skip or Esc jumps to the end card.
- **Phones:** on short frames the dialogue moves into the caption bar, with a 💬 marker over the speaker.
- **Voice:** Barnabas narrates with a little preteen flair ("Huge upgrade… except it does NOT fit."). What the
  characters say is quoted from the text.

**Scene 1, "Giant Problem" (1 Samuel 17), about 85 seconds.** It unlocks on the first win.
1. Valley of Elah.
2. Goliath stomps down the hill and gives his challenge (17:10).
3. Forty days of it (17:16).
4. David arrives with bread and cheese (17:17–18) and asks who defies the armies of the living God (17:26).
5. Saul's armor doesn't fit (17:38–39).
6. Five smooth stones (17:40).
7. "Am I a dog…" (17:43) / "…in the name of the LORD Almighty" (17:45).
8. David runs at him (17:48): a sling spin, a slow-motion stone, then BONK.
9. He falls facedown (17:49), with dizzy cartoon stars and no injury shown.
10. The Philistines run (17:51).
11. David's shades drop: "The battle is the LORD's." (17:47)

**Scenes 2–6,** each about 95 seconds:
- **2 "Wrong Way, Jonah" (Jonah 1–3), paper cut-out.** Torn-paper waves and a friendly fish. Jonah runs to Tarshish,
  sleeps through the storm, goes overboard (1:12), prays inside the fish (2:9), and Nineveh turns back to God (3:4–10).
- **3 "Lions on Mute" (Daniel 6), 8-bit pixel art.** RPG text boxes and a PRAYERS 3/3 counter. The trick law, Daniel
  praying "just as he had done before" (6:10), the sleepless king, and "My God sent his angel" (6:22). The officials'
  fate (6:24) is not shown.
- **4 "Two by Two" (Genesis 6–9), clay stop-motion.** Building the ark, the animals in pairs, "the LORD shut him in"
  (7:16), the rain, Ararat, the raven and the dove, and the rainbow promise (9:13). No people in the water.
- **5 "Fire on the Mountain" (1 Kings 18:16–39), crayon drawing.** 450 to 1, "Shout louder!" (18:27), 12 numbered
  stones, three soakings, "Answer me, LORD" (18:37), the fire, and "The LORD—he is God!" (18:39). Verse 18:40 is not
  shown, and the "relieving himself" line is left out.
- **6 "He Is Risen" (Matthew 27:57–28:10; John 20:1–18), stained glass.** A distant cross at dusk (no wounds), the
  sealed tomb and guards, the women at dawn, the earthquake and the angel, the fainting guards, "He is not here; he
  has risen" (28:6), the folded linen, "Mary." / "Rabboni!" (John 20:16), and the run to tell the disciples.

The end card gives the lesson: "David wasn't brave because he was big. He knew God was bigger."

### Mode borders: easiest to hardest

The title lists modes from easiest to hardest: Little Lambs, Mighty Warriors, Legends, Challenge Modes, then Versus.
Every mode button wears a frame that gets grittier with difficulty (`css/grit.css`, loaded after every skin):

| Grit | Mode | Frame |
|---|---|---|
| 1 | Little Lambs | Clean, rounded, thin |
| 2 | Mighty Warriors | Slightly wobbly line, light grain |
| 3 | Legends | Rougher line, tighter corners, grain and a little dirt |
| 4 | Parable Pros | Thicker warped line, scratches |
| 5 | Prophecy Hunters, Challenge Modes button | Heavy grain, scratches, first hairline cracks |
| 6 | Scholars, Versus button | Square corners, strong warp, cracks from the corners |
| 7 | Holy of Holies | Thickest, gold-tinged, most warped, cracked and scorched at the edges |

How it's built:
- **Frame line:** a pseudo-element, warped by SVG `feTurbulence` + `feDisplacementMap` filters in `index.html`.
  Their strength grows with the grit level.
- **Texture:** layered noise, dirt and scratch textures from data URIs.
- **Skins:** the frame insets further in Victory Lobby, whose cards have angled corners.

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

- Questions come straight from the text, and each one carries a **reference** that someone has checked. Every item has
  been through a two-pass fact check (see [CONTENT-SAFETY.md](CONTENT-SAFETY.md#fact-check)).
- Translation-neutral wording (it works with NIV, ESV, NIrV, CSB, and KJV readers).
- Avoid denominationally contested trivia (canon counts beyond the 27 New Testament books, dates, theology debates).
- Distractors can be silly for Lambs ("Pizza") but plausible for Warriors.
- Each item: `{ lvl, cat, q, a: [correct, ...wrong], ref, fact, host? }`. Final-round items: `{ p, opts: [[label, isRight]] }`.
- Current pool: 1,150 questions (144 Lambs, 142 Warriors, 131 Legends, 191 Parable Pros, 180 Prophecy Hunters,
  179 Scholars, 183 Holy of Holies), 180 final-round prompts (74 hard-only). The original 385 live in `js/data.js` and
  `js/data-modes.js`; the expansion is one file per mode in `js/more/` (`l1.js` … `l7.js`, `final.js`).
- At 8 questions a game, a player sticking to one mode sees new questions for about 16–24 games.

---

## 8. Tech plan

- **Now (prototype):** plain HTML, CSS, and JavaScript with no build step and no dependencies. Open `index.html`
  or host the folder anywhere (GitHub Pages works). Scripts are classic (not modules), so the game even runs from `file://`.
  - `js/data.js`: questions, final prompts, host lines, verses
  - `js/audio.js`: synthesized sound effects
  - `js/music.js`: the five-track synthesized soundtrack and Jukebox data
  - `js/scenes.js`: Story Scenes (animated rewards), the scene player and the gallery
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
| M2: Polish | Character animation pass, voice lines, ~~music loop~~ (done: five tracks), 4 more minigames, Blessing Wheel |
| M3: Ship | PWA/offline, read-aloud mode, parent page, app store builds |
| M4: Party | Multiplayer with phones as controllers |
