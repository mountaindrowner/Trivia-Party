# Bonfire Ice Breaker (draft design)

A get-to-know-you party game for up to 40 people, each on their own phone. Everyone answers a few quick, fun
questions about themselves while the room fills up, and the games are built out of those answers: guess who said
what, guess how the room voted, find your match, hunt each other down for bingo. The point isn't the score. It's
that by the end everyone knows a few surprising things about people they didn't know before.

- **Where:** its own site, `bonfire.thecrossroads.workers.dev` (TV at `/tv`), on the same bones as Spark Wars and
  Holy Huddle: the room server and the phone page in `../huddle/`, the TV page here.
- **Who:** up to 40 players (plus an audience), any age from middle school up. Nothing too personal (see
  `data/questions.js` for the rules the questions follow).

## Kindling: answering questions while everyone joins

As each phone joins it starts getting questions, one at a time, about 10 in all (3 to 4 minutes):

- **Shared questions:** about 4 that everyone answers, so the whole room can be compared ("How many of us...?").
- **Random questions:** the rest, picked from the library, so every night is different and people have different
  things to discover about each other.
- A mix of formats: this-or-that, pick one, yes/no ("Have you ever..."), and one or two short typed answers.
- **Skip** on every question. Typed answers go through the same word filter as Spark Wars, and the phone says
  plainly that answers may show on the big screen with your name.
- **The TV:** the fire grows as answers come in, each new player's name drops into the circle, and live stats
  pop up ("23 of you would rather fly than be invisible!").
- **The leader picks:** which categories are in (Faith on or off, say), and how many questions.
- **Later, if wanted:** a link to answer ahead of time, at home, before the night.

The library (`data/questions.js`): 247 questions in 15 categories (food, would you rather, powers, music and movies,
hobbies, sports, places, animals, growing up, totally me, tech, dreams, silly, faith, have you ever).

## The games (each 3 to 6 minutes, pick any order)

1. **Who Said That?** One typed answer on the TV ("The weirdest food combo I love: fries in a milkshake"). Every
   phone gets 4 names to choose from (the person who wrote it gets "Shh! Keep a straight face"). Points for
   guessing right; the writer gets points for everyone they fool. Then the reveal: "It was JORDAN! Stand up,
   Jordan!"
2. **Read the Room.** A this-or-that from the shared questions: "What percent of us would rather fly?" Everyone
   slides a guess on their phone; closest wins. The reveal shows the split, then calls out the rare ones: "Only 3
   of you picked cats: Ava, Sam and Liam. Find each other!"
3. **Kindred Spirits.** Everyone is paired with the person whose answers match theirs the most (or an opposites
   round: the least). The phone says "Your match: Jordan 🦊. You agree on 7 of 9! Go find them." When both tap
   "Found you!", they get points, and their phones show 3 things they have in common to talk about. The TV shows
   the pairs linking up live. The room actually moves.
4. **Find Someone Who (bingo).** Each phone gets a 4×4 card from the room's own yes answers ("has been on a
   plane", "can juggle"), so every square really is someone in the room. Go ask people; when you find one, tap the
   square and pick their name. It checks their answer. First bingo wins; the TV shows the leaders.
5. **Two Truths and a Lie.** The spotlight lands on one player: the TV shows three things about them, built from
   their answers, with one flipped to false ("Jordan would rather be invisible"). Everyone guesses the lie;
   Jordan gets points for each person fooled. 6 to 8 spotlights a round.
6. **The Campfire Report** (the ending). The group's personality: "This group is 64% night owls, Team Tacos
   wins, everyone's dream trip is Tokyo". Funny awards made from the answers (always kind: "Most Adventurous:
   9 Have You Evers"), and a trading card of each player's top answers on their own phone to screenshot.

## Look and feel

A campfire at night: a deep blue sky with stars, the fire in the middle of the TV, sparks rising, logs around it
where the players' names sit. Each game gets its own twist on that world, like the Spark Wars games.

## To decide

- Who it's for (youth group, adults, mixed, a retreat), so the question mix and the jokes fit.
- Questions on the night (as above) or a questionnaire ahead of time, or both.
- Which games for the first version (suggested: Who Said That?, Read the Room, Kindred Spirits, then the
  Campfire Report).
- Teams or no teams (an icebreaker may work better with everyone mixing).
- The host: Barnabas again, or someone new for the campfire.
