/* Barnabas's lines in Spark Wars: snarky, never mean, and never about faith. One copy for the game (core.js shows
   them in his bubble) and for the recordings (spark/voice/: tools/record.py reads this file).

   Each line is a string, or { t, v }:
     t  what the bubble shows ({name}, {team}, {n}, {set} are filled in)
     v  what the recorded voice says, when t has a name or a number in it (a recording can't know who joined).
        {team} is fine in recordings: each team's version is recorded.
   Punctuation is for the voice too: commas, periods and "..." are his pauses. */
window.SPARK_LINES = {
  title: ["Oh, hey. I'm Barnabas, your host. Yes, I'm a donkey. Click Open a room, and let's get this over with... I mean, started."],
  lobby: [
    "Scan the code, pick a name, and try to look excited.",
    "Phones out, everyone. The code is right there. You can't miss it... well, some of you might.",
    "The room is open. Come on in, and wipe your hooves.",
  ],
  join: [
    { t: "Oh, look. {name} made it.", v: "Oh, look. Somebody else made it." },
    { t: "Welcome, {name}. We were starting to worry. Not really, but still.", v: "Welcome! We were starting to worry. Not really, but still." },
    { t: "{name} is here. Okay, the bar has been set.", v: "And they're here. Okay, the bar has been set." },
    { t: "Hey, {name}. Nice of you to drop by.", v: "Hey, there. Nice of you to drop by." },
  ],
  joinTeam: [
    { t: "{name} joins Team {team}. Good luck with that, Team {team}.", v: "Team {team} gets a new player. Good luck with that, Team {team}." },
    { t: "Team {team}, meet {name}. You're welcome.", v: "Team {team}, meet your newest player. You're welcome." },
  ],
  joinMany: ["A whole crowd just walked in. It's getting cozy in here.", "More people? Fine. The more, the merrier... I guess."],
  full: ["Thirty players. The room is full. Everyone else, enjoy your front-row seats."],
  lobbyBack: ["Okay, what's next? Pick a game.", "Another round? Sure. I've got all night."],
  lobbyWar: ["Team {team} is leading the war. The rest of you... maybe step it up?", "Team {team} is on top. Is anyone going to stop them? Anyone?"],
  voiceOn: ["Voice on. Can you hear me? Good."],

  "rules.talents": ["This is Talents. Answer at your own pace, and every right answer opens a jar. Some jars are great. Some... are not. And please, don't bury your talents. We've all read how that ends."],
  "rules.bluff": ["This is Bluff the Bible. Every fact is real, but one word is missing. Make up a fake answer so good, your friends pick it. Just for this game, okay? Let's not make it a habit."],
  "rules.lightning": ["This is the Lightning Round. Everybody gets the same question, at the same time. Right answers score, and fast right answers score more. So... were you listening this morning?"],
  lightningFinal: ["Last question. It's worth double. Now would be a great time to focus."],
  fastest: [{ t: "{name} got it first. Show-off.", v: "Wow. Somebody got that one fast. Show-off." }],
  "rules.timeline": ["This is Timeline. I deal a card, and you tap where it goes. Here's a hint: creation comes first. You're welcome."],

  double: ["It's double time. Every jar pays double, so... no pressure.", "Last minute, everyone. Everything's doubled. Try not to panic."],
  tenSeconds: ["Ten seconds. Tick, tock.", "Ten seconds left. Finish strong... or at least, finish."],
  lead: ["Well, look at that. Team {team} takes the lead.", "Team {team} is out in front now. Didn't see that coming. Okay, I did."],
  swap: [
    { t: "{name} pulled a swap. Bold. Very bold.", v: "A swap? Bold. Very bold." },
    { t: "{name} just swapped. Interesting choice.", v: "Somebody just pulled a swap. Interesting choice." },
  ],
  tax: [{ t: "{name} is collecting taxes. Zacchaeus would be proud. Well, before he changed, anyway.", v: "Somebody is collecting taxes. Zacchaeus would be proud. Well, before he changed, anyway." }],
  jackpot: [{ t: "{name} hit the jackpot. Don't spend it all in one place.", v: "Jackpot! Don't spend it all in one place." }],

  write: ["Make it believable. Make it sneaky. But keep it clean, please.", "Write something they'll fall for. I believe in you... mostly."],
  pick: ["One of these is true. The rest are... creative.", "Which one is real? Take your time. Actually, don't. There's a timer."],
  fooledMany: [{ t: "{name}'s fake fooled {n} people. Honestly? Impressive.", v: "That fake fooled a lot of people. Honestly? Impressive." }],
  nobodyTruth: ["Nobody? Not one of you? I'm a donkey, and I knew that one.", "Wow. Nobody found it. The fakers are having a great night."],
  allTruth: ["Okay, that one was too easy. The next one's harder, I promise.", "Everybody found it. Look at you, Bible scholars."],

  set: [{ t: "Next up: {set}.", v: "Okay, next set. Here we go." }],
  allRight: ["Look at you, Bible scholars.", "Almost everyone got it. I'm a little proud, honestly."],
  noneRight: ["Oof. Nobody got that one. It was sneaky, I'll give you that.", "Nobody? That's okay. Neither did I. Just kidding... I totally did."],
  streak: [{ t: "{name} is on fire. {n} in a row.", v: "Somebody is on a hot streak. Careful, now." }],

  winTeam: ["Team {team} takes it. That's three War Points. Everyone else... there's always next game."],
  winSolo: [{ t: "{name} wins it. Okay, okay. I'm impressed.", v: "And we have a winner. Okay, okay. I'm impressed." }],
};
