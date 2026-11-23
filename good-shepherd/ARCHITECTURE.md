# Ninety-Nine: architecture and content contracts

Plain browser JavaScript, no build step. Every file is a classic `<script>` that adds to the global `NN` namespace.
Load order (see `index.html`):

| File | Owns |
|---|---|
| `js/core.js` | Constants (`NN.W = 384`, `NN.H = 216`), helpers on `NN.U`, the sprite/people/prop registries and caches (`NN.spr`, `NN.human`, `NN.prop`), the 3×5 world font `NN.ptext` |
| `js/art.js` | Every sprite, person and prop: `NN.PAL`, `NN.SPR`, `NN.MODS`, `NN.SWAPS`, `NN.HLOOK`, `NN.buildHuman`, `NN.PROPS`, `NN.ICONS` |
| `js/audio.js` | Synth, music loops `NN.TRACKS`, `NN.audio`, `NN.sfx` |
| `js/script.js` | All words: `NN.SCRIPT` (chapters, scenes, barks, names, codex, credits) |
| `js/world.js` | The map: regions, ground painting, scenery placement, chapter gates, collision, navigation |
| `js/game.js` | Simulation: the Shepherd and kit, sheep, farm and resources, foes, NPCs, day/night |
| `js/story.js` | Chapter beats, objectives, set pieces, the ending |
| `js/fx.js` | Game feel: settings (`NN.SET`), camera, hit-stop and flashes, particles, ambient wildlife, color grading, vignette |
| `js/help.js` | Lessons (first-time tutorial cards), each chapter's "What's new" card, and when to show them |
| `js/guard.js` | The runtime watchdog: repairs stuck animals, people and pickups, nights that can't finish, and catches errors so the game never freezes (`NN.GUARD.log`) |
| `js/favors.js` | Depth past the story: favors and their rewards (`G.fav`, `G.perks`), the twelve lost bells, travel with Nell, milestones (localStorage `nn-milestones`), and chapter 8, the post-game |
| `js/ui.js` | HUD, dialogue, menus (build, flock, goals and favors, map, codex, milestones, travel, pause), title, end screen |
| `js/main.js` | Boot, input, the frame loop, rendering order, save/load |

## Design rules (from DESIGN.md §1, enforced everywhere)

1. Nothing is ever killed. Wolves flee, frights fade, people are redeemed.
2. No sheep is lost for good. Scared sheep become *lost* and can always be found again.
3. The flock is employed, never exploited. Every production chain ends in caring for sheep.
4. Sheep work because they want to, and they rest. Tired, hurt or hungry sheep don't work, and the player can't force them.
5. Forgiveness is never a dialogue option. Redemption scenes have exactly one button: **Forgive**.
6. Covert, not hidden. Scripture appears on chapter cards, end screens and in the codex, never as a sermon.

## Rendering contracts

- World pixels: canvas 384×216, scaled by whole numbers when it fits. Top-down 3/4 view, 16 px grid.
- **Sprites** (`NN.SPR[name] = { frames: [rows...], out?: color }`): one string per row, one char per pixel, `.` is
  clear, every other char is a key of `NN.PAL`. With `out`, `NN.spr` pads 1 px and adds a colored outline.
  The engine draws a sprite so its **bottom row sits on the entity's y** and it's **centered on x**.
  Side-view sprites face **right**; the engine mirrors them for left.
- **People** (`NN.buildHuman(look, dir, stride, bob)`): returns a 20×36 canvas, feet on rows 31–32, `dir` is
  `'down' | 'up' | 'side'` (side faces right), `stride` is -1/0/1, `bob` is 0/1. Looks are data in `NN.HLOOK`.
  The engine draws people at `(x - 10, y - 33)`.
- **Props** (`NN.PROPS[name] = { make: () => canvas, ox, oy }`): `(ox, oy)` is the foot point inside the image; the
  engine draws at `(x - ox, y - oy)` and depth-sorts on the foot point's y.
- **Icons** (`NN.ICONS[name] = () => canvas`): 9×9 item icons for the HUD and pickups.

## Content contract: art (`js/art.js`)

Existing: `sheep` (16×13, 2 frames), `wolf`, `dog`, `heart`; sheep mods `shades bow beanie bandana specs scarf bandage
doc bell candle collar`; people `shepherd jory joryWatch`; props `oak blossom pine bush berry blue hutDay hutNight
shelter trough hay stump`.

Needed sprites: `lamb` (≈11×9, 2 frames, same palette as sheep), `fright` (≈14×14, 3 frames, a shadow wisp with two
glowing eyes), `prowler` (≈44×26, 2 frames, a lion made of night), `butterfly` (≈5×4, 2 frames). Swaps: `alpha`
(darker wolf with a scar), `ram` (via mod `horns`), plus `bramble` (scruffy, thorn-snagged wool) and `skinny` (Bram's
underfed flock: greyer, thinner-looking wool).

Needed sheep mods (job gear, drawn on the 16×13 sheep): `horns strawhat bucket flowercrown yarn twig sweatband
choir blanket mask` (mask = the Wolf in Wool's suspicious eyebrows).

Needed people (`NN.HLOOK`, with any new `buildHuman` features they need):
`nell` (ferrywoman, sturdy, rolled sleeves, headscarf), `abe` (old fisher, white beard, bucket hat), `tobi` (kid:
shorter legs, big grin, cap), `zeb` (the Collector: short and round, fancy gold-trimmed robe, coin purse; the one
short adult in the game), `hank` (the Hireling: straw hat, patched vest, chewing a stalk), `ludo` (the Wolf in
Wool: a lanky man in an obvious sheep costume, wool body and ears, his own long legs and boots showing),
`ludoPlain` (unmasked, scruffy, sheepish), `bram` (the Bitter Shepherd: tall, huge black beard, heavy brows, dark
cloak, carries a stick), `bramKind` (same, lighter cloak, no stick), `villager1..3` (river folk variety),
`shepherdScarred` (the Shepherd with scars visible on his hands), `shepherdDawn` (a brighter, lighter-cloaked
Shepherd for the third morning).

Needed props, sized to these footprints (W×H in 16 px tiles, foot point at the bottom center of the footprint):

| Prop | Footprint | Notes |
|---|---|---|
| `feeder` | 2×1 | hay rack on legs, with hay |
| `feederEmpty` | 2×1 | the same, empty |
| `troughEmpty` | 2×1 | trough with no water |
| `lean` | 4×2 | small sheep shelter, slanted roof |
| `well` | 2×2 | stone well with roof and bucket |
| `hayBarn` | 4×3 | barn with hay door and a hay pile |
| `infirmary` | 4×3 | white walls, red cross banner, a cot |
| `herbGarden` | 3×2 | low fence and rows of herbs |
| `loom` | 2×2 | wooden loom with colored yarn |
| `workshop` | 3×2 | open-sided roof, sawhorse, log pile, tool rack |
| `watchtower` | 2×2 | tall wooden tower with a bell, ladder |
| `lampPost` / `lampPostLit` | 1×1 | post with lantern |
| `treadmill` (2 frames as `treadmill0`, `treadmill1`) | 2×2 | wooden wheel sheep run in |
| `choirStage` | 3×2 | little stage with a banner |
| `feastTable` | 6×1 | long table with bread, fish, grapes, cups, and benches |
| `olivePress` | 2×2 | stone press |
| `bridge` | 6×3 | wooden plank bridge seen from above (ground layer) |
| `signpost` | 1×1 | |
| `gateBell` | 1×1 | bell on a post |
| `sycamore` | — | a huge climbable tree (foot ≈ trunk), with room for a small man in the branches |
| `thornBush` | — | purple-brown thorny bush |
| `thornWall` | 2×1 | dense thorn hedge segment |
| `boulder`, `boulder2` | — | rockslide boulders |
| `deadTree` | — | bare canyon tree |
| `oliveTree` | — | silvery olive tree |
| `tent` | — | Hank's patched tent |
| `cart` | — | hay cart |
| `tollBooth` | — | the Collector's booth with a sign |
| `bramBarn` | — | dark grey barn with a padlock |
| `branchPile`, `rockPile`, `herbPlant`, `oilJar` | — | pickups |
| `reeds`, `cattail`, `mushrooms`, `lily` | — | small decoration |

Needed icons (`NN.ICONS`): `timber stone hay water wool herbs oil blanket bread heart`.

## Content contract: audio (`js/audio.js`)

Keep the API in the file header. Tracks (keys of `NN.TRACKS`): `title meadow river thorns road canyon highlands
home night frights storm sabbath boss sorrow morning credits`. Weather is part of a track (the `storm` track has rain
noise). Sound effects (`NN.sfx.*`): existing `heart join swing bark bell whistle hurt yelp level baa forgive`, plus
`build collect chop thunder fright roar splash door menu select cancel page munch gulp snore cheer step`.

Polish additions:
- **Volume:** `NN.audio.setMusicVolume(v)` / `setSfxVolume(v)` (0..1, saved). The sfx volume also sets the ambience
  and dialogue voices.
- **Ducking:** `NN.audio.duck(on)` lowers the music under dialogue.
- **Ambience:** `NN.audio.ambience('meadow' | 'night' | 'river' | 'canyon' | 'storm' | 'none')` crossfades the
  ambient bed. main.js picks it by region and time of day.
- **Voices:** `NN.sfx.voice(kind, i)` makes typewriter blips for `shepherd sheep lamb human gruff narrator`.
- **More sfx:** `footstep hover open close goal chapter lessonPop pickupWood pickupStone hitWolf poof sparkle`.

## Content contract: words (`js/script.js`)

`NN.SCRIPT` holds every player-facing sentence except tutorial tips and menu labels.

```js
NN.SCRIPT = {
  chapters: [ { n: 1, title: 'Green Pastures', verse: '…', ref: 'Psalm 23:2', region: 'The Home Meadow', blurb: '…' }, … ],
  speakers: { woolsworth: { name: 'Woolsworth' }, jory: { name: 'Jory' }, … },
  scenes: { key: [ [speaker, text], …, { choice: 'Forgive' }, [speaker, text], … ] },
  barks: { … },   // short random lines, see below
  names: [ … ],   // ≥ 120 sheep names
  codex: [ { id, kind: 'verse' | 'friend' | 'place' | 'note', title, text, ref }, … ],
  credits: [ … ],
};
```

A scene is a list of lines. `{ choice: 'Forgive' }` puts the single Forgive button after the line before it; the lines
after it play once the player presses it. Speaker keys: `shepherd`, `narrator` (no portrait), any key of `speakers`,
or one of `@sheep` (a random sheep in the flock), `@lookout`, `@doc`, `@lamp`, `@hauler`, `@wrangler`, `@gardener`,
`@knitter`, `@gatherer`, `@runner`, `@singer` (whoever holds that job right now; the engine falls back to `@sheep`).

### Scenes the engine plays

Chapter 1, Green Pastures (days 1–3, the Home Meadow): `c1_intro`, `c1_firstHome`, `c1_firstWolf`, `c1_buildHint`
(the flock asks for a feeder), `c1_chompRumor` (day 2 morning), `c1_chomp` (forgive scene), `c1_goodness`, `c1_mercy`,
`c1_jory` (night 3, Jory sneaks in), `c1_joryCaught` (forgive scene), `c1_joryDawn` (forgive scene if he's caught by
the sunrise instead), `c1_end`.

Chapter 2, Still Waters (days 4–7, the Riverlands, east across the river): `c2_intro` (water's low, the pond is muddy;
Jory knows springs across the river, fenced off by the Collector), `c2_bridgeNeed`, `c2_bridgeBuilt`, `c2_nell`,
`c2_abe`, `c2_tobi` (Tobi says the Collector climbs the big sycamore to look down on everybody, "because he's short"),
`c2_tollBooth` (the Shepherd reads the toll sign), `c2_zeb` (under the sycamore: "Zeb, come down. I'm staying at your
house today." Forgive scene. Zeb promises to tear his fences down and pay back four times), `c2_zebAfter`,
`c2_wellBuilt`, `c2_minnow` (night: a lamb stranded on a sandbar, the chapter's One), `c2_minnowFound`, `c2_end`.

Chapter 3, He Restores My Soul (days 8–11, the Thorn Hills, north): `c3_intro` (Chomp says his old flock, the Bramble
Bunch, lives in the thorns, all hurt), `c3_thornWall` (the Shepherd cuts through and gets scratched), `c3_bramble`
(first sight of the hurt flock), `c3_nettle`, `c3_briar`, `c3_sorrel`, `c3_tansy`, `c3_bracken` (one short scene
each as they're won over: one bites, one hides, one cries, one is grumpy, one feels nothing), `c3_infirmary`,
`c3_firstFright` (Night Frights: shadows only light can chase), `c3_thistle` (the old bitter ram who leads them;
forgive scene), `c3_maze` (day 10: a lamb, Burr, is stuck in the middle of the thorn maze), `c3_burrFound`, `c3_end`.

Chapter 4, Paths of Righteousness (days 12–14, the Old Road, west): `c4_intro`, `c4_rockslide` (the Treadmill Crew
clears it), `c4_hankMeet` (Hank Haywood, hired hand, paid by the day, big talker), `c4_hayBarn`, `c4_stormComing`,
`c4_hankRuns` (night 13, storm and wolves: Hank runs and leaves his flock), `c4_hankFlockSafe` (dawn), `c4_hank`
(Hank comes back ashamed; forgive scene; he becomes Foreman), `c4_dot` (Hank's lost lamb, the chapter's One),
`c4_end`.

Chapter 5, The Valley of the Shadow (days 15–18, Shadow Canyon, south): `c5_intro` (dark even at noon; the Shepherd
says "I'm here" more than usual), `c5_lamps` (build lamp posts down the canyon), `c5_cold` (cold nights: the Loom
makes blankets), `c5_lou` (a "sheep" named Lou joins; he is obviously a man in a sheep suit; nobody but the reader
notices at first), `c5_lookoutSus` (the Lookout has questions), `c5_ludo` (night: Lou opens the gate for the wolves;
caught; unmasked as Ludo; forgive scene; becomes Fleece Inspector), `c5_ninetynine` (night 18: the fold is full and
one is missing. Pip. Woolsworth: "We're fine. Go."), `c5_pipFound` (deep in the canyon), `c5_pipHome`, `c5_end`.

Chapter 6, A Table Before My Enemies (days 19–21, the Highlands, north-east): `c6_intro`, `c6_bramMeet` (Bram Stone
drives his skinny flock with a stick and tells the Shepherd to clear off), `c6_bramFlock` (his sheep are hungry and
thirsty), `c6_bramAngry` (after you feed them), `c6_olives`, `c6_choir`, `c6_raid` (night 20: wolves hit Bram's flock;
you defend it while he watches), `c6_tableSet` (day 21, the Sabbath: a long table with every redeemed friend at it),
`c6_bramInvite` (you walk up to Bram and invite him; forgive scene), `c6_table` (the feast: funny, warm, Psalm 23:5
in spirit), `c6_end`.

Chapter 7, The House of the Lord (days 22–26, home): `c7_intro` (the farm is thriving; big paw prints at the edge of
the meadow; wolves running *away* from something), `c7_talk_jory`, `c7_talk_zeb`, `c7_talk_hank`, `c7_talk_ludo`,
`c7_talk_bram`, `c7_talk_thistle`, `c7_talk_chomp`, `c7_talk_baabara`, `c7_talk_woolsworth` (the Shepherd visits each
friend the day before; quietly a goodbye, though nobody says so), `c7_lastDay`, `c7_gate` (night 24: "I am the
gate." He stands in the gate and won't move), `c7_prowler` (the Prowler arrives), `c7_fall` (the flock is safe; he
isn't; told gently, nothing graphic), `c7_flockMorning` (day 25: the flock wakes without him; Woolsworth decides to
do what he taught them), `c7_flockTasks` (feed everyone, keep the fire, find the lamb who wandered), `c7_flockNight`
(night 25: the flock keeps watch together), `c7_return` (day 26, the third morning: the gate is open, light, he's
there, scars on his hands), `c7_feedMySheep`, `c7_wolves` (Isaiah 11:6: the wolf lies down with the lamb), `c7_end`.

Every chapter: `sabbath` (day 7, 14, 21: the farm rests, the flock eats together; one generic scene plus
`sabbath_c2`, `sabbath_c4`), `leaveTheNinetyNine` is `c5_ninetynine`.

### Barks

```js
barks: {
  traits: { brave: {…}, dramatic: {…}, sleepy: {…}, nerdy: {…}, chatty: {…}, hungry: {…} },
  //   each trait: { talk: [...], accept: [...], decline: [...], nap: [...], night: [...] }
  join: [...], found: [...], scared: [...], hungry: [...], thirsty: [...], cramped: [...], cold: [...], healed: [...],
  jobs: { lookout: [...], doc: [...], lamp: [...], hauler: [...], wrangler: [...], gardener: [...], knitter: [...],
          gatherer: [...], runner: [...], singer: [...], guard: [...] },   // lines when a sheep starts a job
  helpers: { jory: [...], zeb: [...], hank: [...], ludo: [...], bram: [...], thistle: [...], chomp: [...],
             woolsworth: [...], baabara: [...], ramsey: [...], nell: [...], abe: [...], tobi: [...] },
  pop: { idle: [...], wild: [...], lost: [...], happy: [...] },   // ≤ 8 chars, shown in the 3×5 world font
}
```

## Codex ids the engine unlocks

`psalm23_1` … `psalm23_6`, `lost_sheep`, `good_shepherd`, `the_gate`, `the_thief`, `the_hireling`, `zacchaeus`,
`wolf_in_wool`, `bad_shepherds`, `terror_by_night`, `lambs_in_arms`, `song_in_the_night`, `prowling_lion`,
`sabbath`, `feed_my_sheep`, `wolf_and_lamb`, `the_table`, `third_day`, plus one `friend_<key>` entry per named
friend (`woolsworth baabara ramsey chomp jory goodness mercy zeb nell abe tobi thistle burr hank ludo pip bram`) and
one `place_<region>` per region (`meadow river thorns road canyon highlands`).

## Favors and the post-game (`js/favors.js`)

- Favors are offered through the normal talk events: `favors.js` wraps `NN.STORY.emit` and handles `talk` /
  `talkSheep` before the story does, but only after a person's first-meeting and chapter 7 goodbye scenes have played.
- Each favor in `NN.FAV.FAVORS` has a giver, a `when` gate, a requirement (`need()`, or an item in `G.favItems`), and
  a `reward()` that usually sets a flag in `G.perks`. `game.js` reads perks through `pk(id)`: `farWhistle`,
  `patience`, `zebDouble`, `herbChest`, `pitchfork`, `echo`. `favors.js` handles `travel` and `goldenBell` itself.
- Scenes: `fav_<id>_ask`, `fav_<id>_done`, `fav_zeb_<nell|abe|tobi>`, `fav_echo_stone`, `fav_bramble_done`.
  Reminders: `barks.favors.<id>`; bell toasts: `barks.bellFound`.
- Milestones are checked every two seconds of play and stored per device, not per save.
- Post-game: the end screen calls `NN.FAV.prepPostgame()` (chapter 8, all regions open, saved), and "Keep
  shepherding" calls `beginPostgame()` (chapter card, then `pg_start`). Chapter 8 has its own goals (`ST.OBJ[8]`),
  nights scaled to the flock (`ST.nightFor`), and four new wild sheep each dawn until about 112 exist. Ninety-nine
  home plays `pg_ninetynine` and a second end screen; play continues after it.
