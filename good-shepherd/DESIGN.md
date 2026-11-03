# NINETY-NINE: Game Design Sketch

*Working title. "Leave the ninety-nine, go find the one" (Luke 15:4).*

A pixel-art survival-farming game. You are the Good Shepherd. By day you go out and find wild, lost and hurt
sheep, bring them home, and build up a farm that the flock runs with you. By night the wolves come, and you keep the
flock safe. Every foe that is a person gets redeemed, never destroyed. Most redeemed foes join the farm. The sheep have
the attitude. The Shepherd is the calm center.

It plays like **Vampire Survivors** at night (move, and your tools fire on their own, with level-up picks) and like a
light **Factorio** by day (build pastures, water, hay lines and machines, and assign jobs). It runs about **10 hours**.

The gospel is never preached at the player. It's in the rules: what the Shepherd will and won't do, what the
machines are for, who gets a second chance, and how the story ends.

---

## 1. The rules under the game

These six rules are the point of the game. Every system has to obey them, and when a feature idea breaks one, the
idea changes.

1. **Nothing is ever killed.** Wolves are turned away (they run off). Night Frights are lit up until they vanish.
   People are redeemed. The Shepherd's tools are a staff, a rod, a lantern, a sling, a harp, a whistle and two dogs.
   Swords and fire are not in the kit.
2. **No sheep is lost for good.** A sheep can be scared, scattered, hurt or stolen, but it is always still out
   there, and you can always go find it. "No one will snatch them out of my hand" (John 10:28). The pressure in
   the game comes from time, distance and the dark, never from permanent loss.
3. **The flock is employed, never exploited.** Every production line ends in caring for sheep. Nothing is sold for
   profit. There is no meat and no market. Wool is sheared in spring because it's good for the sheep, and it
   becomes blankets for cold lambs. Hay feeds the flock. Medicine heals it. Bigger fields make room for more rescued sheep.
4. **Sheep work because they want to, and they rest.** A sheep only takes a job when it's healthy and happy. Tired
   sheep stop and nap, and you can't override that. Every seventh day the whole farm stops for a **Sabbath feast**,
   with machines off and everyone at one table, and the feast gives the biggest buff in the game.
5. **Forgiveness is not a dialogue option.** When a foe is broken down, the Shepherd kneels and there is exactly one
   button: **FORGIVE**. Players will look for the other button. There isn't one. Your choices are about *how* to
   care (where to build, who to rescue first, which tools to carry), never *whether* to.
6. **Covert, not hidden.** No sermons and no quiz. Chapter titles come from Psalm 23. Parables become mechanics.
   Scripture appears only as one quiet line on each chapter card, in the end screens, and in an optional codex,
   *The Shepherd's Notes*, which unlocks as you play. A player who has never opened a Bible should still feel the
   story. A player who has will notice it everywhere.

## 2. Who you play

**Recommendation: you play the Good Shepherd himself.** He's never named. He's just "the Shepherd," in a teal
hooded cloak with a crook, a lantern and a quiet voice.

- **Why:** players get to *watch* His choices up close. The fun is in carrying out what He'd do: going back out
  for the one, standing between the wolf and the lamb, offering the thief a seat by the fire.
- **What it costs us:** He can't fail morally, so the game never asks the player to choose between mercy and
  punishment (rule 5), and He can't lose sheep for good (rule 2). That's fine. Difficulty comes from logistics and
  nights, the way it does in Factorio and Vampire Survivors.
- **The other option** (open question for the owner): you play a young under-shepherd learning from the Good
  Shepherd, as in John 21 ("Feed my sheep"). That allows player mistakes, but the Shepherd moves to the side of the
  story. My vote is to keep the player as the Shepherd, and hand control to the flock in the finale (section 8).

## 3. Core loop

```
            ┌──────────────────────────── DAY (≈ 5 min) ────────────────────────────┐
            │  Explore: find wild / lost / hurt sheep, win their trust, walk them home │
            │  Build:   pasture, fences, wells, hay lines, infirmary, lamps, towers    │
            │  Staff:   healthy sheep volunteer for jobs; tired sheep rest             │
            └──────────────────────────────────┬──────────────────────────────────────┘
                                               │ dusk bell
            ┌──────────────────────────── NIGHT (≈ 3 min) ──────────────────────────┐
            │  Survive: wolves, Night Frights, thieves. Your tools fire on their own   │
            │  Hearts from every rescue or turned-away wolf → level up → pick 1 of 3   │
            │  Sheep left outside the fold get scattered (not killed): find them again │
            └──────────────────────────────────┬──────────────────────────────────────┘
                                               │ sunrise
            ┌──────────────────────────── DAWN (≈ 30 s) ────────────────────────────┐
            │  Count the flock, heal the hurt, story beats, redemptions, new sheep     │
            └─────────────────────────────────────────────────────────────────────────┘
```

Level-ups (called *Knacks*) last for the current chapter, like a Vampire Survivors run. Buildings, sheep, jobs
and redeemed helpers carry over for the whole game. So each chapter is a fresh survival run on top of a farm that
keeps growing.

## 4. The Shepherd's kit (night, auto-firing, all non-lethal)

| Tool | What it does | Where it comes from |
|---|---|---|
| **Staff** | Swings at nearby wolves and knocks them back; each hit adds fear | Psalm 23:4 |
| **Lantern** | A circle of light. Wolves in it slow down and lose their nerve | Psalm 119:105 |
| **Whistle** (button) | Wild sheep nearby trust you faster; scattered sheep stop running | John 10:27, "my sheep listen to my voice" |
| **Sling** | Pebbles at the nearest wolf. "A shepherd boy once made this famous." | 1 Samuel 17 |
| **Harp Song** | A pulse every few seconds that pushes every wolf back | 1 Samuel 16:23 |
| **Rod** | A slam that roots wolves in place for a moment | Psalm 23:4 |
| **Goodness & Mercy** | Two sheepdogs who follow you everywhere and chase wolves off | Psalm 23:6 |
| **Oil** | A healing aura: hurt sheep near you recover | Psalm 23:5 |
| **Bread & Fish** | Feeds every sheep nearby at once, refilling their energy | John 6 |

Knacks (level-up picks): Longer Staff, Quick Hands, Brighter Lantern, Swift Sandals, Kind Voice, plus a level for
each tool. Evolutions work like Vampire Survivors weapon evolutions: max out two Knacks for a combined version, e.g.
**Lantern + Kind Voice = City on a Hill**, where the fold itself shines and wolves won't come near it.

## 5. Sheep

### Winning trust
Each kind of wild sheep is won over in its own way:

| Kind | How you win it | Lesson in the mechanic |
|---|---|---|
| **Wild** | Walk near; trust fills | He comes to us |
| **Lost** (scattered at night) | Trust fills twice as fast; they know your voice | John 10:4 |
| **Hurt** ("Chomp") | Bites if you rush in. Stand still and let them come to you | Gentleness, patience |
| **Stubborn** | Runs away; only the dogs can turn them back toward you | Goodness and Mercy follow |
| **Stuck** (thorns, pits, cliffs) | Build a bridge, ladder or rope line to reach them | Luke 14:5 |
| **The One** (one per chapter) | Out past the edge of the map, only at night | Luke 15:4 |

### Jobs (the sheep run the farm)
Healthy sheep volunteer when a building needs them. They wear the gear, they have opinions, and they love it.

| Job | Gear | Effect | Sample line |
|---|---|---|---|
| Lookout | Bell | Shows incoming wolves on screen edges | "I see a wolf. I see two wolves. Oh no, I see math." |
| Doc | Cap with a red cross | Heals hurt sheep in the fold | "Nobody ask where I got the stethoscope." |
| Lamplighter | Candle hat | Bigger fire; wolves near it get nervous | "Fire good. Dark bad. That's the whole job." |
| Guard | Spiked collar | Chases wolves off the fold at night | (Chomp) "Found a better use for these teeth." |
| Water Wrangler | Bucket | Runs wells and channels | "Still waters. Very still. I made sure." |
| Hay Hauler | Pitchfork | Moves hay along the hay line | "Leg day, every day." |
| Treadmill Crew | Sweatband | Powers machines by running | "We insisted. The Shepherd said we could stop any time." |
| Knitter | Needles | Wool → blankets for winter nights | "This one's for the new lamb. It has a pocket." |
| Teacher | Glasses | New sheep learn jobs faster | "Rule one: we don't bite. Looking at you, Chomp." |
| Choir | Tiny robes | Night music that calms the flock | (the band plays the night theme live) |

Every sheep has a name, a look (shades, beanies, bows, bandanas) and a trait (Brave, Dramatic, Sleepy, Nerdy,
Chatty). Traits change their lines and which jobs they'll pick.

### Care chains (the Factorio part)
Every chain ends at a sheep:

```
Grass ─► Hay Barn ─► Hay Line ─► Feeders at outposts ──────────► sheep with energy
Spring ─► Well ─► Channels ─► Troughs (Still Waters) ──────────► sheep with water
Wool (spring shearing) ─► Loom ─► Blankets ────────────────────► lambs survive Winter nights
Herbs ─► Drying rack ─► Infirmary ─► Bandages ─────────────────► hurt sheep healed
Timber ─► Workshop ─► Fence / Bridge / Ladder kits ────────────► reach stuck sheep, bigger fields
Oil press ─► Lamps on posts ───────────────────────────────────► light that keeps the dark back
```

Machines are built on a tile grid. Lines are hay carts on tracks pushed by the Treadmill Crew, and pipes are
wooden channels. Throughput matters only because more sheep need more care. A bigger flock is the "score."

## 6. Foes and redemptions

**People are redeemed. Darkness is defeated.** Animals and people get a *Nerve* meter instead of health. Staying
close, light and the staff wear Nerve down. When it's empty, a redemption scene plays and the single
**FORGIVE** button appears. Some walk away the first time and come back later, like the prodigal son.
Redeemed people join the farm in a job that turns their old life around.

| Foe | Bible root | How they fight | Redeemed as |
|---|---|---|---|
| **Wolves** (packs) | John 10:12 | Rush sheep outside the light | Not redeemed in a scene. In the finale they lie down with the lambs (Isaiah 11:6) |
| **Night Frights** | Psalm 91:5 | Shadows that scatter sheep; only light hurts them | Gone at dawn |
| **Jory the Thief** | John 10:10 | Sneaks into the fold and leads sheep off | **Night Watch**: knows every trick a thief would try |
| **Hank the Hireling** | John 10:12–13 | Runs when wolves come and leaves his own flock behind | **Foreman** who never leaves his post |
| **The Wolf in Wool** | Matthew 7:15 | Hides in your flock; Lookouts can spot him | **Fleece Inspector**, comic relief, very proud of his eye for fakes |
| **Bram the Bitter Shepherd** | Ezekiel 34 | Drives his own sheep too hard; they're skinny and scared | **Teacher**: learns to lead by caring |
| **The Collector** | Luke 19 (Zacchaeus) | Fences off the good pasture and charges for water | Tears the fences down; gives back four times over |
| **Chomp** and other hurt sheep | Luke 15 | Bite, flee, hide | Guard, and later the gentlest sheep on the farm |
| **The Prowler** (final) | 1 Peter 5:8 | A lion made of night; not a person, not redeemable | Defeated (section 8) |

## 7. Story: seven chapters on Psalm 23

About 10 hours: 7 chapters × about 10 in-game days × about 8.5 minutes per day-and-night ≈ 10 hours, plus scenes.

| # | Chapter | Psalm 23 | Biome | New system | Main foe | Redemption | Set piece |
|---|---|---|---|---|---|---|---|
| 1 | **Green Pastures** | v. 2a | Meadows | Trust, fold, first jobs | Wolves, Jory | Chomp, Jory | The first night |
| 2 | **Still Waters** | v. 2b | Rivers and marsh | Wells, channels, troughs | The Collector | The Collector | Tearing the fences down |
| 3 | **He Restores My Soul** | v. 3a | Thorn hills | Infirmary, herbs, Docs | Night Frights | A whole flock of hurt sheep | The thorn maze rescue |
| 4 | **Paths of Righteousness** | v. 3b | Old road | Hay lines, carts, treadmills | Hank the Hireling | Hank | Hank's flock in a storm |
| 5 | **Valley of the Shadow** | v. 4 | Dark canyon | Lamps on posts; long nights | Wolf packs, the Wolf in Wool | Wolf in Wool | **Leave the 99**: the fold is full, one is missing, and the game makes you go |
| 6 | **A Table Before My Enemies** | v. 5 | Highlands | Feasts; every redeemed foe at one table | Bram the Bitter Shepherd | Bram | The feast, with enemies invited to dinner |
| 7 | **The House of the Lord** | v. 6 | Home valley | Everything | The Prowler | (section 8) | (section 8) |

Each chapter card shows the chapter name big, with one verse line underneath in small type. That's the only
scripture on screen during play.

## 8. The ending (John 10:11)

The last night of Chapter 7 is the hardest night in the game. The Prowler comes for the whole flock, and the
Shepherd stands in the gate of the fold ("I am the gate," John 10:9) and won't move.

1. **The gate.** You can't leave the gate. Everything you've built and everyone you've redeemed fights the night
   with you: Jory on watch, Hank holding his post, Chomp guarding, the choir singing. It works, and the flock
   is safe. But the Prowler gets through to the Shepherd. The screen goes dark. It's handled quietly, with nothing
   graphic: the lantern drops and the music stops.
2. **Three days as the flock.** Control passes to the sheep. For three short in-game days you play the flock you
   cared for: Woolsworth, Baabara, Chomp, Jory. You run the farm the way He taught you to, and you go out after
   lost sheep yourselves. It's harder without Him, and the jokes get quieter. This is the payoff of "He cares for
   the sheep so they can care for the sheep."
3. **The third morning.** The fold gate is open, there's light, and He's back. The pixel art shows the scars on His
   hands for the first time. The Prowler is gone for good.
4. **Feed my sheep.** One last line, to whichever sheep you played most as (John 21:17). Then the credits: every
   sheep you found, by name, walking into the fold, with the wolves lying down among the lambs.

Final card: *"I am the good shepherd. The good shepherd lays down his life for the sheep." (John 10:11)*

## 9. Look, sound, voice

- **Resolution:** 320×180, scaled by whole numbers. 16 px tiles. People are 12×16, sheep 12×9, wolves 14×9.
- **Proportions:** not chibi. People have three-head proportions and long cloaks. Sheep are round but with
  sharp, readable silhouettes. The attitude comes from props (shades, beanies, bows), poses and fast,
  snappy animation.
- **Palette:** about 24 colors. Warm meadow greens, hay gold and wool cream by day. Deep navy nights where the only
  color is lantern and fire light, drawn as chunky stepped circles (no smooth gradients). The Shepherd's teal is the
  one cool color that stays bright at night.
- **Music:** chiptune funk. Bouncy bass and claps by day, a slow minor groove at night, and full band at the
  Sabbath feast. The sheep choir sings over it once you have one.
- **Writing voice:** the sheep are spunky, sarcastic and loyal ("WOLF. That's a wolf. I'm not being dramatic.").
  The Shepherd says very little, always kindly and never sarcastic. The humor is never at a hurt character's expense.
- **Fonts:** Press Start 2P for HUD and banners, Pixelify Sans for dialogue.

## 10. The prototype in this folder

`index.html` plays a vertical slice of **Chapter 1: Green Pastures**, three days and three nights (about 10 minutes).

- Find and befriend 20+ wild sheep and walk them through the gate into the fold.
- Day and night cycle with stepped-light darkness; wolves at night; sheep left outside get scattered, never killed,
  and you go find them again.
- Auto-firing staff and lantern, hearts, and level-up picks: Longer Staff, Quick Hands, Brighter Lantern, Swift
  Sandals, Kind Voice, Sling, Harp Song, Goodness, Mercy.
- Jobs that switch on as the fold fills: Lookout (3 sheep home), Doc (5), Lamplighter (8), Guard (Chomp).
- **Chomp**, the hurt sheep who bites (stand still and let him come), and **Jory the Thief** on night 3. Both
  get the one-button FORGIVE scene.
- Chiptune music and sound effects, all synthesized; keyboard and touch controls.

**Controls:** WASD or arrow keys to move (on touch, drag anywhere). Space whistles. M mutes, P pauses.
`N` skips to the next dawn or dusk (a testing shortcut).

## 11. Roadmap

1. **Slice polish (this folder):** tune the first night, add the build menu (fences, troughs, lamp posts), and
   save the game on the device.
2. **Farm layer:** tile grid, care chains for hay and water, job assignment UI, sheep energy and naps, the
   Sabbath day.
3. **Chapters 2–3:** rivers, the Collector, the Infirmary chain, Night Frights.
4. **Engine decision:** stay in plain web canvas (works on phones and itch.io like Trivia Holy Party), or move to
   Godot before the farm grid gets big. Recommendation: stay on web through Chapter 2, then decide.
5. **Chapters 4–7, the ending, the codex.**
6. **Steam/itch release** with controller support.

## 12. Questions for the owner

1. **Player role:** the Good Shepherd himself (current plan), or an under-shepherd learning from Him?
2. **Audience:** all ages, like Trivia Holy Party, or teens and adults? This sets how dark Chapter 5 and the
   ending can be.
3. **Title:** *Ninety-Nine*, *The Good Shepherd*, *Flock*, or something else?
4. **Platform:** web first (phones, church tablets, itch.io), or aim for Steam and consoles?
5. **Where it lives:** keep it in this repo next to Trivia Holy Party, or move it to its own repo?
