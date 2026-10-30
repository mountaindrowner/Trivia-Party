# itch.io page kit

Images and text for the game's itch.io page. The full walkthrough (where each piece goes, embed options, tags, theme
colors) is on the kit page linked from the session; this file is the short version.

| File | Where it goes on itch.io |
|---|---|
| `cover-1260x1000.png` (also `cover-630x500.png`) | Cover image (315:250 shape) |
| `screenshot-1-title.png` … `screenshot-6-story-scenes.png` | Screenshots, in this order |
| `fire-on-the-mountain.gif` | Inside the description, after the first paragraph |
| `banner-1920x400.png` | Edit theme → Banner |
| `background-1920x1080.jpg` | Edit theme → Background image (fill, fixed) |
| `embed-1280x720.png` | Embed options → image behind the Run game button |
| `description.txt` | Description |

**Upload:** build the single-file game (all CSS and JS inlined into one `index.html`), zip it, set Kind of project to
HTML, and tick "This file will be played in the browser". Embed at 960 × 600, mobile friendly, with the fullscreen
button on.

**Short description:** A Bible trivia party for kids and families: 1,150 questions, 24 minigames and 6 animated Bible
cartoons.

**Tags:** Trivia, Quiz, Bible, Christian, Kids, Family Friendly, Party Game, Educational, Local multiplayer, Minigames.
Genre: Educational.

**Edit theme:** background `#3B2BC4` with `background-1920x1080.jpg` (no repeat, top center, fixed), page (BG2)
`#140A2E`, text `#F3EFFF`, headers `#FFC53D`, links `#5CC8FF`, buttons `#FF3D7F`. Body font Exo 2 (medium), header font
Anton: the game's own fonts. Make the description's section names Heading style so they pick up the header look.
