# Spark Wars

The youth group game: up to 30 players, each on their own phone, in teams. Made for Church of the Crossroads'
middle school group; Trivia Holy Party (the rest of this repo) stays the kids' and family game.

- **Play:** open `https://sparkwars.thecrossroads.workers.dev/tv` on the TV or projector (a laptop is easiest: the
  leader runs it with the mouse). Click **Open a room**. Everyone else goes to `sparkwars.thecrossroads.workers.dev`
  on their phone, or scans the QR code, and types the 4-letter code.
- **Same bones as Holy Huddle:** the room server and the phone page are in `../huddle/` (one code for both games).
  The questions come from Trivia Holy Party's levels for ages 9 and up (`../js/data.js`, `../js/data-modes.js`,
  `../js/more/l2.js` to `l7.js`).
- **Files:** `index.html` (the page), `spark.js` (the whole TV side), `spark.css` (its look). `../huddle/build.py`
  inlines them into one page for the server.

## The lobby

- The TV shows the QR code, the join address and the code, and a grid of 30 seats that fill as phones join.
  Click a player twice to remove them. **Lock** stops new joins. Past 30, phones join as the audience and watch.
- The first player in is the VIP 👑: they can start the game, skip the rules and pick **Play again** from their phone.
- The leader picks:
  - **Game:** Talents. Bluff the Bible and Timeline are shown as coming soon.
  - **Teams:** off, 2, 3 or 4 (Volt ⚡, Blaze 🔥, Surge 🌊, Nova ✨). Everyone is shuffled into even teams at the
    start. Play again keeps the teams; late joiners go to the smallest team.
  - **Time:** 3, 5, 7 or 10 minutes.
  - **Steals:** on or off (the Tax collector and Swap jars).
  - **Questions:** Bible Mix (ages 9–13+ levels), Bible Basics, Legends, Jesus' Teaching, Prophecy, Scholars or
    Holy of Holies.
- Settings are saved on that computer (`sparkwars-prefs`).

## Talents (Matthew 25:14–30)

Everyone plays at their own pace for the whole time:

1. Each phone gets its own question (everyone has the pack in a different order, so neighbors don't match).
2. **Wrong:** the phone shows the right answer and its verse, then the next question about 2½ seconds later.
3. **Right:** pick 1 of 3 jars. Inside (the chances are in `JARS` in `spark.js`):
   - **+10, +20, +30, +50 or +100** talents
   - **✨ Well done! ×2**: doubles your talents ("Well done, good and faithful servant!")
   - **🕳️ Buried**: nothing this time (the servant who hid his bag of gold)
   - **🦋 Moths & rust**: lose 25% (Matthew 6:19)
   - **🎁 Cheerful giver**: give 20 to the last player on your team (or in the game) and get 40 back (2 Corinthians 9:7)
   - **🧾 Tax collector** (steals on): take 25% from one of the top 4 players on another team
   - **🔄 Swap** (steals on): trade all your talents with someone on another team who has more
4. The last minute is **⚡ Double Time**: every jar pays double.

The phone always shows your talents, your place and your team. When someone takes from you, swaps with you or
gives to you, your next question says so.

The TV shows the clock, a bar per team, the top 10 (with 🔥 streaks of 3 or more), and a live feed of the big
moments (jackpots, doubles, gifts, steals, swaps). At the end: the winning team, the top three on a podium, and
awards for most right answers, the longest streak, the most generous and the whole group's total. **Play again**
or **Back to the lobby** on the TV or the VIP's phone.

## How it scales

The TV sends each phone its next screen as soon as it answers, so 30 players at their own pace is about 15 messages
a second each way, well inside the server's limits (a TV may send 100 a second). Phones that drop out rejoin on
their own and pick up where they were. Tested with a TV, 3 real phones and 28 bot phones (one of them in the
audience): see `../huddle/server/test/spark.mjs` for the server side.
