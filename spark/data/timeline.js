/* Timeline: sets of Bible events, people and books in their order (NIV).
   Each set's `items` run first to last. Every order comes from the Bible text itself: the narrative order of one
   book, a numbered sequence, a genealogy, or the order of the books in the Protestant Bible. Nothing here depends
   on harmonizing the Gospels or on dates that scholars debate.
   t: short label (max 24 characters). ref: where it is (for books: its place in the Old or New Testament).
   lvl: 1 easy, 2 medium, 3 hard. */
window.SPARK_DATA = window.SPARK_DATA || {};
SPARK_DATA.TIMELINE = [

  /* ---------- Old Testament ---------- */

  { title: "The days of creation", lvl: 1, items: [
      { t: "Light", ref: "Genesis 1:3" },
      { t: "Sky between the waters", ref: "Genesis 1:6" },
      { t: "Land, seas and plants", ref: "Genesis 1:9" },
      { t: "Sun, moon and stars", ref: "Genesis 1:14" },
      { t: "Fish and birds", ref: "Genesis 1:20" },
      { t: "Animals and people", ref: "Genesis 1:24" },
      { t: "God rests", ref: "Genesis 2:2" } ] },

  { title: "Stories from Genesis 1–12", lvl: 1, items: [
      { t: "God creates the world", ref: "Genesis 1" },
      { t: "Adam and Eve leave Eden", ref: "Genesis 3:23" },
      { t: "Cain and Abel", ref: "Genesis 4" },
      { t: "Noah builds the ark", ref: "Genesis 6:14" },
      { t: "The rainbow promise", ref: "Genesis 9:13" },
      { t: "The tower of Babel", ref: "Genesis 11" },
      { t: "God calls Abram", ref: "Genesis 12:1" } ] },

  { title: "Adam to Noah (Genesis 5)", lvl: 3, items: [
      { t: "Adam", ref: "Genesis 5:1" },
      { t: "Seth", ref: "Genesis 5:3" },
      { t: "Enosh", ref: "Genesis 5:6" },
      { t: "Enoch", ref: "Genesis 5:18" },
      { t: "Methuselah", ref: "Genesis 5:21" },
      { t: "Lamech (Noah's father)", ref: "Genesis 5:25" },
      { t: "Noah", ref: "Genesis 5:29" } ] },

  { title: "Family line: Noah to Joseph", lvl: 2, items: [
      { t: "Noah", ref: "Genesis 6" },
      { t: "Shem", ref: "Genesis 11:10" },
      { t: "Terah", ref: "Genesis 11:24" },
      { t: "Abraham", ref: "Genesis 11:26" },
      { t: "Isaac", ref: "Genesis 21:3" },
      { t: "Jacob", ref: "Genesis 25:26" },
      { t: "Joseph", ref: "Genesis 30:24" } ] },

  { title: "Joseph's life in Genesis", lvl: 1, items: [
      { t: "Joseph's ornate robe", ref: "Genesis 37:3" },
      { t: "Sold to traders", ref: "Genesis 37:28" },
      { t: "Potiphar's house", ref: "Genesis 39:1" },
      { t: "The cupbearer's dream", ref: "Genesis 40:9" },
      { t: "Pharaoh's dreams", ref: "Genesis 41:1" },
      { t: "\"I am Joseph!\"", ref: "Genesis 45:3" },
      { t: "Jacob moves to Egypt", ref: "Genesis 46:6" } ] },

  { title: "The life of Moses", lvl: 1, items: [
      { t: "Baby in a basket", ref: "Exodus 2:3" },
      { t: "Flees to Midian", ref: "Exodus 2:15" },
      { t: "The burning bush", ref: "Exodus 3:2" },
      { t: "Plagues on Egypt", ref: "Exodus 7–12" },
      { t: "Crossing the Red Sea", ref: "Exodus 14" },
      { t: "The Ten Commandments", ref: "Exodus 20" },
      { t: "Sees the Promised Land", ref: "Deuteronomy 34:1" } ] },

  { title: "The plagues of Egypt (Exodus 7–10)", lvl: 2, items: [
      { t: "Water turns to blood", ref: "Exodus 7:20" },
      { t: "Frogs everywhere", ref: "Exodus 8:6" },
      { t: "Swarms of gnats", ref: "Exodus 8:17" },
      { t: "Painful boils", ref: "Exodus 9:10" },
      { t: "Hailstorm", ref: "Exodus 9:23" },
      { t: "Locusts", ref: "Exodus 10:13" },
      { t: "Three days of darkness", ref: "Exodus 10:22" } ] },

  { title: "Judges in the book of Judges", lvl: 3, items: [
      { t: "Othniel", ref: "Judges 3:9" },
      { t: "Ehud", ref: "Judges 3:15" },
      { t: "Deborah", ref: "Judges 4:4" },
      { t: "Gideon", ref: "Judges 6:11" },
      { t: "Jephthah", ref: "Judges 11:1" },
      { t: "Samson", ref: "Judges 13:24" } ] },

  { title: "David's life (1 Samuel–1 Kings)", lvl: 2, items: [
      { t: "Anointed by Samuel", ref: "1 Samuel 16:13" },
      { t: "Defeats Goliath", ref: "1 Samuel 17:50" },
      { t: "Spares Saul in a cave", ref: "1 Samuel 24:3" },
      { t: "Becomes king in Hebron", ref: "2 Samuel 2:4" },
      { t: "Ark comes to Jerusalem", ref: "2 Samuel 6:12" },
      { t: "Absalom's rebellion", ref: "2 Samuel 15:10" },
      { t: "Names Solomon king", ref: "1 Kings 1:30" } ] },

  { title: "Elijah and Elisha in Kings", lvl: 2, items: [
      { t: "Elijah fed by ravens", ref: "1 Kings 17:6" },
      { t: "Fire on Mount Carmel", ref: "1 Kings 18:38" },
      { t: "God's gentle whisper", ref: "1 Kings 19:12" },
      { t: "Elijah taken to heaven", ref: "2 Kings 2:11" },
      { t: "Naaman is healed", ref: "2 Kings 5:14" },
      { t: "Fiery army at Dothan", ref: "2 Kings 6:17" } ] },

  { title: "Kings of Judah (1–2 Kings)", lvl: 3, items: [
      { t: "Rehoboam", ref: "1 Kings 14:21" },
      { t: "Asa", ref: "1 Kings 15:9" },
      { t: "Jehoshaphat", ref: "1 Kings 22:41" },
      { t: "Joash", ref: "2 Kings 12:1" },
      { t: "Hezekiah", ref: "2 Kings 18:1" },
      { t: "Josiah", ref: "2 Kings 22:1" },
      { t: "Zedekiah", ref: "2 Kings 24:18" } ] },

  { title: "Stories in Daniel 1–6", lvl: 2, items: [
      { t: "Refusing the king's food", ref: "Daniel 1:8" },
      { t: "Statue dream explained", ref: "Daniel 2:31" },
      { t: "The fiery furnace", ref: "Daniel 3:21" },
      { t: "Proud king eats grass", ref: "Daniel 4:33" },
      { t: "Writing on the wall", ref: "Daniel 5:5" },
      { t: "Daniel in the lions' den", ref: "Daniel 6:16" } ] },

  { title: "Exile and return", lvl: 3, items: [
      { t: "Babylon takes Jerusalem", ref: "2 Kings 25:9" },
      { t: "Babylon falls", ref: "Daniel 5:30" },
      { t: "Cyrus sends Jews home", ref: "Ezra 1:3" },
      { t: "Temple foundation laid", ref: "Ezra 3:10" },
      { t: "Temple is finished", ref: "Ezra 6:15" },
      { t: "Nehemiah rebuilds wall", ref: "Nehemiah 6:15" },
      { t: "Ezra reads the Law", ref: "Nehemiah 8:3" } ] },

  /* ---------- New Testament ---------- */

  { title: "Jesus' birth in Luke 1–2", lvl: 2, items: [
      { t: "Angel visits Zechariah", ref: "Luke 1:11" },
      { t: "Angel visits Mary", ref: "Luke 1:26" },
      { t: "John the Baptist born", ref: "Luke 1:57" },
      { t: "Jesus born in Bethlehem", ref: "Luke 2:7" },
      { t: "Angels tell shepherds", ref: "Luke 2:9" },
      { t: "Simeon holds Jesus", ref: "Luke 2:28" },
      { t: "Boy Jesus at the temple", ref: "Luke 2:46" } ] },

  { title: "Jesus' ministry in Luke", lvl: 2, items: [
      { t: "Baptized by John", ref: "Luke 3:21" },
      { t: "Tempted by the devil", ref: "Luke 4:2" },
      { t: "Peter's big catch", ref: "Luke 5:6" },
      { t: "Calms the storm", ref: "Luke 8:24" },
      { t: "Feeds the 5,000", ref: "Luke 9:16" },
      { t: "Zacchaeus up a tree", ref: "Luke 19:4" },
      { t: "Rides into Jerusalem", ref: "Luke 19:35" } ] },

  { title: "Jesus' story in Matthew", lvl: 1, items: [
      { t: "Wise men bring gifts", ref: "Matthew 2:11" },
      { t: "Baptized in the Jordan", ref: "Matthew 3:13" },
      { t: "Sermon on the Mount", ref: "Matthew 5:1" },
      { t: "Feeds the 5,000", ref: "Matthew 14:19" },
      { t: "Rides into Jerusalem", ref: "Matthew 21:7" },
      { t: "Dies on the cross", ref: "Matthew 27:50" },
      { t: "Rises from the dead", ref: "Matthew 28:6" } ] },

  { title: "Holy Week in Mark", lvl: 2, items: [
      { t: "Rides into Jerusalem", ref: "Mark 11:7" },
      { t: "Clears the temple", ref: "Mark 11:15" },
      { t: "The Last Supper", ref: "Mark 14:22" },
      { t: "Prays in Gethsemane", ref: "Mark 14:32" },
      { t: "Trial before Pilate", ref: "Mark 15:2" },
      { t: "Dies on the cross", ref: "Mark 15:37" },
      { t: "The empty tomb", ref: "Mark 16:6" } ] },

  { title: "Jesus' signs in John", lvl: 3, items: [
      { t: "Water into wine", ref: "John 2:9" },
      { t: "Official's son healed", ref: "John 4:50" },
      { t: "Healing at Bethesda", ref: "John 5:8" },
      { t: "Feeding the 5,000", ref: "John 6:11" },
      { t: "Man born blind sees", ref: "John 9:7" },
      { t: "Lazarus raised", ref: "John 11:44" } ] },

  { title: "The early church in Acts 1–9", lvl: 2, items: [
      { t: "Jesus goes up to heaven", ref: "Acts 1:9" },
      { t: "Holy Spirit at Pentecost", ref: "Acts 2:4" },
      { t: "Lame man walks", ref: "Acts 3:8" },
      { t: "Seven chosen to serve", ref: "Acts 6:5" },
      { t: "Stephen is martyred", ref: "Acts 7:59" },
      { t: "Philip and the Ethiopian", ref: "Acts 8:27" },
      { t: "Saul meets Jesus", ref: "Acts 9:4" } ] },

  { title: "Paul's life in Acts", lvl: 2, items: [
      { t: "Blinded on Damascus road", ref: "Acts 9:3" },
      { t: "Sent out with Barnabas", ref: "Acts 13:2" },
      { t: "The Jerusalem council", ref: "Acts 15:6" },
      { t: "Preaches in Athens", ref: "Acts 17:22" },
      { t: "Arrested in Jerusalem", ref: "Acts 21:33" },
      { t: "Speaks to King Agrippa", ref: "Acts 26:1" },
      { t: "Shipwreck on Malta", ref: "Acts 28:1" } ] },

  { title: "Paul's travels in Acts 16–20", lvl: 3, items: [
      { t: "Lydia believes", ref: "Acts 16:14" },
      { t: "Singing in Philippi jail", ref: "Acts 16:25" },
      { t: "Bereans check Scripture", ref: "Acts 17:11" },
      { t: "Tentmaking in Corinth", ref: "Acts 18:3" },
      { t: "Riot in Ephesus", ref: "Acts 19:29" },
      { t: "Eutychus falls asleep", ref: "Acts 20:9" } ] },

  { title: "The seven churches (Revelation 2–3)", lvl: 3, items: [
      { t: "Ephesus", ref: "Revelation 2:1" },
      { t: "Smyrna", ref: "Revelation 2:8" },
      { t: "Pergamum", ref: "Revelation 2:12" },
      { t: "Thyatira", ref: "Revelation 2:18" },
      { t: "Sardis", ref: "Revelation 3:1" },
      { t: "Philadelphia", ref: "Revelation 3:7" },
      { t: "Laodicea", ref: "Revelation 3:14" } ] },

  /* ---------- Books of the Bible (Protestant order) ---------- */

  { title: "The first five books", lvl: 1, items: [
      { t: "Genesis", ref: "OT book 1" },
      { t: "Exodus", ref: "OT book 2" },
      { t: "Leviticus", ref: "OT book 3" },
      { t: "Numbers", ref: "OT book 4" },
      { t: "Deuteronomy", ref: "OT book 5" } ] },

  { title: "History books: Joshua to Esther", lvl: 2, items: [
      { t: "Joshua", ref: "OT book 6" },
      { t: "Judges", ref: "OT book 7" },
      { t: "Ruth", ref: "OT book 8" },
      { t: "1 Samuel", ref: "OT book 9" },
      { t: "1 Kings", ref: "OT book 11" },
      { t: "Ezra", ref: "OT book 15" },
      { t: "Esther", ref: "OT book 17" } ] },

  { title: "Poetry and prophets: Job to Jonah", lvl: 3, items: [
      { t: "Job", ref: "OT book 18" },
      { t: "Psalms", ref: "OT book 19" },
      { t: "Proverbs", ref: "OT book 20" },
      { t: "Isaiah", ref: "OT book 23" },
      { t: "Jeremiah", ref: "OT book 24" },
      { t: "Daniel", ref: "OT book 27" },
      { t: "Jonah", ref: "OT book 32" } ] },

  { title: "The Gospels and Acts", lvl: 1, items: [
      { t: "Matthew", ref: "NT book 1" },
      { t: "Mark", ref: "NT book 2" },
      { t: "Luke", ref: "NT book 3" },
      { t: "John", ref: "NT book 4" },
      { t: "Acts", ref: "NT book 5" } ] },

  { title: "Paul's letters: Romans to 1 Thessalonians", lvl: 2, items: [
      { t: "Romans", ref: "NT book 6" },
      { t: "1 Corinthians", ref: "NT book 7" },
      { t: "Galatians", ref: "NT book 9" },
      { t: "Ephesians", ref: "NT book 10" },
      { t: "Philippians", ref: "NT book 11" },
      { t: "Colossians", ref: "NT book 12" },
      { t: "1 Thessalonians", ref: "NT book 13" } ] },

  { title: "Hebrews to Revelation", lvl: 3, items: [
      { t: "Hebrews", ref: "NT book 19" },
      { t: "James", ref: "NT book 20" },
      { t: "1 Peter", ref: "NT book 21" },
      { t: "1 John", ref: "NT book 23" },
      { t: "Jude", ref: "NT book 26" },
      { t: "Revelation", ref: "NT book 27" } ] }
];
