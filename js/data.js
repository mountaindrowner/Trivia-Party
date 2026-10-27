/* Trivia Holy Party — content.
 * Questions: first entry in `a` is always the correct answer (shuffled at runtime).
 * lvl 1 = Little Lambs (ages 5–8), lvl 2 = Mighty Warriors (ages 9–12).
 */
window.THP = window.THP || {};

THP.QUESTIONS = [
  // ---------- Little Lambs ----------
  { lvl: 1, cat: "Noah's Ark", q: "How many days and nights did it rain while Noah was on the ark?", a: ["40", "7", "12", "100"], ref: "Genesis 7:12", fact: "After the rain stopped, the ark rested on the mountains of Ararat." },
  { lvl: 1, cat: "Creation", q: "What did God make on the very first day?", a: ["Light", "Animals", "People", "Fish"], ref: "Genesis 1:3–5", fact: "God said, \"Let there be light,\" and there was light!" },
  { lvl: 1, cat: "Big Fish Story", q: "Who was swallowed by a huge fish?", a: ["Jonah", "Peter", "Noah", "Moses"], ref: "Jonah 1:17", fact: "Jonah was inside the fish for three days and three nights." },
  { lvl: 1, cat: "Giant Slayer", q: "What did David use to beat the giant Goliath?", a: ["A sling and a stone", "A big sword", "A bow and arrow", "A huge shield"], ref: "1 Samuel 17:49–50", fact: "David picked five smooth stones from a stream. He only needed one!" },
  { lvl: 1, cat: "Christmas", q: "Where was baby Jesus laid after He was born?", a: ["A manger", "A castle bed", "A boat", "A tent"], ref: "Luke 2:7", fact: "A manger is a box that animals eat out of." },
  { lvl: 1, cat: "Noah's Ark", q: "Who built the ark?", a: ["Noah", "Abraham", "Adam", "Elijah"], ref: "Genesis 6:13–14", fact: "God told Noah exactly how big to build it." },
  { lvl: 1, cat: "Jesus' Friends", q: "How many apostles did Jesus choose?", a: ["12", "3", "7", "40"], ref: "Mark 3:14", fact: "Peter, Andrew, James and John were all fishermen." },
  { lvl: 1, cat: "Creation", q: "Who was the first man God made?", a: ["Adam", "Noah", "Abel", "Moses"], ref: "Genesis 2:7", fact: "God formed Adam from the dust of the ground." },
  { lvl: 1, cat: "Miracles", q: "What did a boy share so Jesus could feed 5,000 people?", a: ["5 loaves and 2 fish", "12 apples", "A pot of soup", "3 big cakes"], ref: "John 6:9", fact: "After everyone ate, there were 12 baskets of leftovers!" },
  { lvl: 1, cat: "Noah's Ark", q: "What did God put in the sky as a promise after the flood?", a: ["A rainbow", "A comet", "A new moon", "A cloud shaped like a dove"], ref: "Genesis 9:13", fact: "The rainbow is God's promise never to flood the whole earth again." },
  { lvl: 1, cat: "Brave Hearts", q: "Who was thrown into a den of lions for praying to God?", a: ["Daniel", "David", "Samson", "Jonah"], ref: "Daniel 6:16–22", fact: "God sent an angel to shut the lions' mouths." },
  { lvl: 1, cat: "Miracles", q: "What did Jesus walk on in the middle of the night?", a: ["Water", "Clouds", "Fire", "A rope"], ref: "Matthew 14:25", fact: "Peter walked on the water too, until he got scared." },
  { lvl: 1, cat: "Exodus", q: "Who led God's people out of Egypt?", a: ["Moses", "Joseph", "Jacob", "Paul"], ref: "Exodus 3:10", fact: "God spoke to Moses from a burning bush that did not burn up." },
  { lvl: 1, cat: "Creation", q: "What was the name of the garden where Adam and Eve lived?", a: ["Eden", "Gethsemane", "Babylon", "Canaan"], ref: "Genesis 2:8", fact: "A river flowed out of Eden to water the garden." },
  { lvl: 1, cat: "Christmas", q: "In what town was Jesus born?", a: ["Bethlehem", "Nazareth", "Jerusalem", "Rome"], ref: "Luke 2:4–7", fact: "Bethlehem is also King David's hometown." },
  { lvl: 1, cat: "Christmas", q: "What did the wise men follow to find Jesus?", a: ["A star", "A map", "A river", "An angel choir"], ref: "Matthew 2:9", fact: "The wise men brought gold, frankincense and myrrh." },
  { lvl: 1, cat: "Brave Hearts", q: "Which strong man got his strength from God and had very long hair?", a: ["Samson", "Goliath", "Saul", "Peter"], ref: "Judges 16:17", fact: "Samson once tore apart a lion with his bare hands!" },
  { lvl: 1, cat: "Creation", q: "On which day did God rest?", a: ["The seventh day", "The first day", "The third day", "The tenth day"], ref: "Genesis 2:2", fact: "God made everything in six days, then rested." },
  { lvl: 1, cat: "Jesus Said", q: "Jesus said faith as small as what kind of seed can move mountains?", a: ["A mustard seed", "A sunflower seed", "An apple seed", "A pumpkin seed"], ref: "Matthew 17:20", fact: "A mustard seed is tiny, but it grows into a big plant." },
  { lvl: 1, cat: "Jesus' Friends", q: "Which short man climbed a tree to see Jesus?", a: ["Zacchaeus", "Nicodemus", "Lazarus", "Bartholomew"], ref: "Luke 19:3–4", fact: "Jesus stopped, looked up, and said He would visit Zacchaeus' house!" },
  { lvl: 1, cat: "Easter Week", q: "What animal did Jesus ride into Jerusalem?", a: ["A young donkey", "A camel", "A white horse", "An elephant"], ref: "John 12:14", fact: "People waved palm branches and shouted \"Hosanna!\"", host: "A DONKEY! Best answer in the whole game. I'm not biased." },
  { lvl: 1, cat: "Family Stories", q: "Who got a very special colorful coat from his father?", a: ["Joseph", "Benjamin", "Isaac", "David"], ref: "Genesis 37:3", fact: "Joseph's father Jacob loved him very much." },
  { lvl: 1, cat: "Jesus Said", q: "What did Jesus say is the greatest commandment?", a: ["Love God with all your heart", "Always eat your vegetables", "Never be sad", "Go to bed on time"], ref: "Matthew 22:37–38", fact: "The second is like it: love your neighbor as yourself." },
  { lvl: 1, cat: "Easter Week", q: "On what day of the week did Jesus rise from the dead?", a: ["Sunday, the first day", "Friday", "Wednesday", "Saturday"], ref: "Luke 24:1–6", fact: "The women found the stone rolled away and the tomb empty!" },

  // ---------- Mighty Warriors ----------
  { lvl: 2, cat: "Book Smarts", q: "How many books are in the New Testament?", a: ["27", "39", "12", "50"], ref: "Matthew – Revelation", fact: "It starts with the four Gospels and ends with Revelation." },
  { lvl: 2, cat: "Record Breakers", q: "Who is the oldest person in the Bible?", a: ["Methuselah", "Noah", "Abraham", "Moses"], ref: "Genesis 5:27", fact: "Methuselah lived to be 969 years old!" },
  { lvl: 2, cat: "Family Stories", q: "What was the name of Abraham's wife?", a: ["Sarah", "Rachel", "Ruth", "Rebekah"], ref: "Genesis 17:15", fact: "Sarah had baby Isaac when she was 90 years old." },
  { lvl: 2, cat: "Brave Hearts", q: "Shadrach, Meshach and ___ were thrown into the fiery furnace.", a: ["Abednego", "Obadiah", "Absalom", "Nebuchadnezzar"], ref: "Daniel 3:19–27", fact: "The king saw a fourth person walking with them in the fire!" },
  { lvl: 2, cat: "Easter Week", q: "Which disciple said he didn't know Jesus three times?", a: ["Peter", "Thomas", "John", "Judas"], ref: "Luke 22:54–62", fact: "Later Jesus forgave Peter and asked him three times, \"Do you love me?\"" },
  { lvl: 2, cat: "Kings & Crowns", q: "Who was the first king of Israel?", a: ["Saul", "David", "Solomon", "Samuel"], ref: "1 Samuel 10:1", fact: "Saul was taller than everyone else in Israel." },
  { lvl: 2, cat: "Kings & Crowns", q: "Which king asked God for wisdom instead of riches?", a: ["Solomon", "Herod", "Saul", "Ahab"], ref: "1 Kings 3:9–12", fact: "God gave Solomon wisdom AND riches." },
  { lvl: 2, cat: "Exodus", q: "How many plagues did God send on Egypt?", a: ["10", "7", "3", "12"], ref: "Exodus 7–12", fact: "Frogs, gnats, flies, hail, locusts... Pharaoh was very stubborn." },
  { lvl: 2, cat: "Exodus", q: "On which mountain did Moses receive the Ten Commandments?", a: ["Mount Sinai", "Mount Everest", "Mount Ararat", "Mount Zion"], ref: "Exodus 19:20; 20:1–17", fact: "God wrote the commandments on two tablets of stone." },
  { lvl: 2, cat: "Family Stories", q: "Who was the mother of John the Baptist?", a: ["Elizabeth", "Mary", "Hannah", "Martha"], ref: "Luke 1:57–60", fact: "Elizabeth was a relative of Mary, Jesus' mother." },
  { lvl: 2, cat: "Strange Snacks", q: "What did John the Baptist eat in the wilderness?", a: ["Locusts and wild honey", "Bread and grapes", "Fish and figs", "Manna and quail"], ref: "Matthew 3:4", fact: "He also wore clothes made of camel's hair. Itchy!" },
  { lvl: 2, cat: "Book Smarts", q: "What is the first book of the New Testament?", a: ["Matthew", "Acts", "Genesis", "Romans"], ref: "Matthew 1:1", fact: "Matthew begins with Jesus' family tree." },
  { lvl: 2, cat: "Brave Hearts", q: "Which queen bravely spoke to the king to save her people?", a: ["Esther", "Jezebel", "Sheba", "Vashti"], ref: "Esther 4:14–16", fact: "Her cousin Mordecai said she became queen \"for such a time as this.\"" },
  { lvl: 2, cat: "Family Stories", q: "Who said, \"Where you go I will go, and your God will be my God\"?", a: ["Ruth", "Naomi", "Miriam", "Deborah"], ref: "Ruth 1:16", fact: "Ruth said this to her mother-in-law, Naomi." },
  { lvl: 2, cat: "Family Stories", q: "Who was Jacob's twin brother?", a: ["Esau", "Isaac", "Laban", "Reuben"], ref: "Genesis 25:24–26", fact: "Esau was born first, and Jacob was holding his heel!" },
  { lvl: 2, cat: "Church Begins", q: "What appeared over the disciples' heads on the day of Pentecost?", a: ["Tongues of fire", "Halos of gold", "Tiny clouds", "Doves"], ref: "Acts 2:3–4", fact: "The Holy Spirit came, and they spoke in other languages." },
  { lvl: 2, cat: "Prophets", q: "Which prophet went up to heaven in a whirlwind?", a: ["Elijah", "Elisha", "Isaiah", "Jeremiah"], ref: "2 Kings 2:11", fact: "A chariot of fire and horses of fire appeared too!" },
  { lvl: 2, cat: "Jesus' Friends", q: "Which disciple used to be a tax collector?", a: ["Matthew", "Andrew", "James", "Philip"], ref: "Matthew 9:9", fact: "Jesus said, \"Follow me,\" and Matthew got up and followed." },
  { lvl: 2, cat: "Fruit of the Spirit", q: "Which one is NOT a fruit of the Spirit?", a: ["Riches", "Joy", "Patience", "Kindness"], ref: "Galatians 5:22–23", fact: "Love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control." },
  { lvl: 2, cat: "Battle Plans", q: "How many times did Israel march around Jericho on the seventh day?", a: ["7", "1", "3", "12"], ref: "Joshua 6:15–20", fact: "The priests blew trumpets, the people shouted, and the walls fell down!" },
  { lvl: 2, cat: "Prophets", q: "Which boy heard God call his name in the night?", a: ["Samuel", "David", "Josiah", "Isaac"], ref: "1 Samuel 3:10", fact: "Samuel answered, \"Speak, for your servant is listening.\"" },
  { lvl: 2, cat: "Book Smarts", q: "Which book of the Bible has the most chapters?", a: ["Psalms", "Genesis", "Isaiah", "Revelation"], ref: "Psalms 1–150", fact: "Psalms has 150 chapters. Many are songs!" },
  { lvl: 2, cat: "Church Begins", q: "Before he was called Paul, the apostle was known as...", a: ["Saul", "Silas", "Stephen", "Simon"], ref: "Acts 13:9", fact: "Paul met Jesus in a bright light on the road to Damascus." },
  { lvl: 2, cat: "Book Smarts", q: "What is the last book of the Bible?", a: ["Revelation", "Malachi", "Jude", "Acts"], ref: "Revelation 22:21", fact: "John wrote Revelation on the island of Patmos." },
];

/* Final round — "The Narrow Gate". Each prompt shows 3 choices; tap every one that fits. */
THP.FINAL_PROMPTS = [
  { p: "Tap the Gospels", opts: [["Mark", true], ["John", true], ["Acts", false]] },
  { p: "Tap the Gospels", opts: [["Matthew", true], ["Luke", true], ["John", true]] },
  { p: "Tap Fruit of the Spirit", opts: [["Joy", true], ["Kindness", true], ["Pride", false]] },
  { p: "Tap people who were kings", opts: [["David", true], ["Solomon", true], ["Jonah", false]] },
  { p: "Tap Jesus' miracles", opts: [["Calming a storm", true], ["Healing a blind man", true], ["Splitting the Red Sea", false]] },
  { p: "Tap women of the Bible", opts: [["Ruth", true], ["Goliath", false], ["Esther", true]] },
  { p: "Tap Old Testament books", opts: [["Psalms", true], ["Romans", false], ["Exodus", true]] },
  { p: "Tap plagues of Egypt", opts: [["Frogs", true], ["Snowmen", false], ["Locusts", true]] },
  { p: "Tap the Armor of God", opts: [["Shield of faith", true], ["Boots of speed", false], ["Helmet of salvation", true]] },
  { p: "Tap the prophets", opts: [["Elijah", true], ["Pilate", false], ["Isaiah", true]] },
  { p: "Tap who was swallowed by a fish", opts: [["Peter", false], ["Jonah", true], ["Noah", false]] },
  { p: "Tap Jesus' 12 apostles", opts: [["Andrew", true], ["Moses", false], ["Thomas", true]] },
  { p: "Tap things on Noah's ark", opts: [["Noah's family", true], ["Animals two by two", true], ["A lions' den", false]] },
  { p: "Tap gifts of the wise men", opts: [["Gold", true], ["Frankincense", true], ["Myrrh", true]] },
  { p: "Tap things God made in Creation week", opts: [["Sun and moon", true], ["Fish and birds", true], ["Pizza", false]] },
  { p: "Tap brothers in the Bible", opts: [["Cain & Abel", true], ["Jacob & Esau", true], ["Ruth & Naomi", false]] },
  { p: "Tap books of the Bible", opts: [["Hezekiah", false], ["Jude", true], ["Genesis", true]] },
  { p: "Tap who met Jesus", opts: [["Zacchaeus", true], ["Mary Magdalene", true], ["Noah", false]] },
];

/* Barnabas the Donkey's lines. {name} is replaced with the player's name. */
THP.LINES = {
  intro: [
    "Hee-HAW! Welcome to TRIVIA HOLY PARTY! I'm Barnabas, the most encouraging donkey in all of Judea.",
    "Your lamp is full of oil. Answer Bible questions to keep it burning, and survive the Trials.",
    "At the end you'll race Grumbles the Goat to the Narrow Gate. Ready, {name}?",
  ],
  correct: ["Hallelujah! That's right!", "Correct! Somebody's been reading their Bible!", "YES! I'm doing a happy donkey dance!", "Bingo! Wait, can donkeys say bingo?", "Right on! Even Solomon would be impressed.", "Correct-a-mundo!"],
  wrong: ["Oh no, not quite!", "Hee-haw... that wasn't it.", "Close! Well, not that close.", "Oopsie daisy!"],
  timeout: ["Time's up! The candle burned out!", "Too slow! Even a tortoise would have tapped by now."],
  trial: ["To the TRIAL ROOM! Don't worry, I believe in you!", "That means a Trial! James 1 says trials make us strong!", "Off to the Trial Room! Be brave!"],
  trialWin: ["You passed the trial! Your lamp keeps shining!", "Victory! Your oil is safe!"],
  trialLose: ["A drop of your lamp oil spilled!", "Uh oh, your lamp is getting dimmer!"],
  lost: ["Your lamp went out... you're a LOST SHEEP! But the Good Shepherd always goes looking for the lost one!"],
  found: ["REJOICE! The Good Shepherd found you! Your lamp is lit again!"],
  finalIntro: [
    "It's time for the final race: THE NARROW GATE!",
    "Tap EVERY answer that fits. Each right tap moves you forward. Each wrong tap moves you back!",
    "Every drop of oil you saved gives you a head start. Grumbles the Goat is already complaining. Go!",
  ],
  goat: ["Grumbles: \"Baaah, this is too hard!\"", "Grumbles: \"Hmph! I'm coming for you!\"", "Grumbles: \"Grumble grumble grumble...\"", "Grumbles: \"Are we there yet?\""],
  win: ["You made it through the Narrow Gate! Well done, good and faithful servant!"],
  lose: ["Grumbles got there first... but don't worry. God's mercies are new every morning. Try again!"],
};

THP.VERSES = [
  ["Be strong and courageous. Do not be afraid.", "Joshua 1:9"],
  ["Your word is a lamp for my feet and a light on my path.", "Psalm 119:105"],
  ["I can do all this through him who gives me strength.", "Philippians 4:13"],
  ["Let your light shine before others.", "Matthew 5:16"],
  ["Enter through the narrow gate.", "Matthew 7:13"],
];
