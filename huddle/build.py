"""Builds the pages each party-game site hands out, into huddle/server/static/<site>/ (not committed):
  holy/phone.html   the Holy Huddle join page          holy/tv.html   all of Trivia Holy Party, for the TV at /tv
  spark/phone.html  the Spark Wars join page           spark/tv.html  Spark Wars, for the TV at /tv
  bonfire/phone.html  the Bonfire join page            bonfire/tv.html  Bonfire Ice Breaker, for the TV at /tv
                                                       bonfire/night.html  Lights Out, for the host's phone at /night
  spark/clips/, spark/icons/, spark/files.js   Barnabas's recorded lines (/voice/clips/), the app icons and the
                    web app manifest, bundled into the Spark Wars Worker
The phone page is the same code for both, with its own look (<html data-game="...">).
Run before `npx wrangler deploy` (Holy Huddle), `npx wrangler deploy --env spark` (Spark Wars),
`npx wrangler deploy --env bonfire` (Bonfire), or `wrangler dev`."""
import os, re, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
static = os.path.join(here, "server", "static")
read = lambda *p: open(os.path.join(*p), encoding="utf-8").read()
def write(path, html):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(html)
    print(os.path.relpath(path, root), len(html), "bytes")

# The phone page, once per game.
phone = os.path.join(here, "phone")
base = read(phone, "index.html")
base = base.replace('<link rel="stylesheet" href="phone.css">', "<style>\n" + read(phone, "phone.css") + "</style>")
base = base.replace('<script src="phone.js"></script>', "<script>\n" + read(phone, "phone.js") + "</script>")
assert "phone.css" not in base and 'src="phone.js"' not in base
write(os.path.join(static, "holy", "phone.html"), base)
spark = (base.replace('<html lang="en">', '<html lang="en" data-game="spark">')
         .replace("<title>Holy Huddle</title>", "<title>Spark Wars</title>")
         .replace("family=Lilita+One&", "family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Lilita+One&"
                  # each Spark Wars game's own fonts (its look on the phone: huddle/phone/themes.css)
                  "family=Bungee&family=Monoton&family=Chakra+Petch:wght@500;700&family=Luckiest+Guy&family=Baloo+2:wght@600;800&family=Ultra&family=Fredoka:wght@500;600;700&family=Titan+One&family=Nunito:wght@700;800;900&")
         .replace("</head>", "<style>\n" + read(phone, "themes.css") + "</style>\n</head>")
         .replace('content="#2b1a7a"', 'content="#23104f"'))
assert 'data-game="spark"' in spark and "Bricolage" in spark and "Luckiest" in spark and 'data-theme="talents"' in spark
write(os.path.join(static, "spark", "phone.html"), spark)
bonfire = (base.replace('<html lang="en">', '<html lang="en" data-game="bonfire">')
           .replace("<title>Holy Huddle</title>", "<title>Bonfire</title>")
           .replace("family=Lilita+One&", "family=Shrikhand&family=Outfit:wght@500;600;700;800&family=Lilita+One&")
           .replace('content="#2b1a7a"', 'content="#0c1030"')
           # Lights Out's secret card (a Bonfire room run from the host's phone): its look and its screen.
           .replace("</head>", "<style>\n" + read(root, "bonfire", "night", "card.css") + "</style>\n</head>")
           .replace("<script>\n", "<script>\n" + read(root, "bonfire", "night", "card.js") + "\n</script>\n<script>\n", 1))
assert 'data-game="bonfire"' in bonfire and "Shrikhand" in bonfire and "LO_CARD" in bonfire and ".lo-card" in bonfire
write(os.path.join(static, "bonfire", "phone.html"), bonfire)

# Trivia Holy Party: the whole game, for the TV.
subprocess.run([sys.executable, os.path.join(root, "tools", "build.py"), os.path.join(static, "holy", "tv.html")], check=True)

# Spark Wars: spark/index.html with its css and js (and the shared question files) inlined.
html = read(root, "spark", "index.html")
html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', lambda m: "<style>\n" + read(root, "spark", m.group(1)) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+\.js)"></script>',
              lambda m: "<script>\n" + read(root, "spark", m.group(1)).replace("</script", "<\\/script") + "\n</script>", html)
assert not re.search(r'(href|src)="[^"]+\.(css|js)"', html), "a Spark Wars file was not inlined"
write(os.path.join(static, "spark", "tv.html"), html)

# Bonfire Ice Breaker: bonfire/index.html with its css and js (and the question library) inlined.
html = read(root, "bonfire", "index.html")
html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', lambda m: "<style>\n" + read(root, "bonfire", m.group(1)) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+\.js)"></script>',
              lambda m: "<script>\n" + read(root, "bonfire", m.group(1)).replace("</script", "<\\/script") + "\n</script>", html)
assert not re.search(r'(href|src)="[^"]+\.(css|js)"', html), "a Bonfire file was not inlined"
write(os.path.join(static, "bonfire", "tv.html"), html)

# Lights Out: bonfire/night/index.html (the host's phone, at /night) with its css and js inlined.
night_dir = os.path.join(root, "bonfire", "night")
html = read(night_dir, "index.html")
html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', lambda m: "<style>\n" + read(night_dir, m.group(1)) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+\.js)"></script>',
              lambda m: "<script>\n" + read(night_dir, m.group(1)).replace("</script", "<\\/script") + "\n</script>", html)
assert not re.search(r'(href|src)="[^"]+\.(css|js)"', html), "a Lights Out file was not inlined"
write(os.path.join(static, "bonfire", "night.html"), html)

# Barnabas's recorded lines, bundled into the Spark Wars Worker: the MP3s next to a module that imports them all.
# (Cloudflare's static-asset upload doesn't work from a cloud session, so they ride along in the Worker; at about
# 1.7 MB they fit the free plan's 3 MB limit for a Worker.)
import shutil
clips_src = os.path.join(root, "spark", "voice", "clips")
clips_dst = os.path.join(static, "spark", "clips")
shutil.rmtree(clips_dst, ignore_errors=True)
shutil.rmtree(os.path.join(static, "spark-assets"), ignore_errors=True)
names = sorted(f for f in os.listdir(clips_src) if f.endswith(".mp3")) if os.path.isdir(clips_src) else []
if names:
    shutil.copytree(clips_src, clips_dst, ignore=shutil.ignore_patterns("*.wav"))
# The app icons and the web app manifest: on an iPhone, "Add to Home Screen" opens the TV page full screen, with
# no browser bars (an iPhone won't make a web page full screen any other way, and those bars show when it's
# mirrored to a TV).
import json
icons_src = os.path.join(root, "spark", "icons")
icons_dst = os.path.join(static, "spark", "icons")
shutil.rmtree(icons_dst, ignore_errors=True)
shutil.copytree(icons_src, icons_dst)
icons = sorted(f for f in os.listdir(icons_src) if f.endswith(".png"))
manifest = json.dumps({
    "name": "Spark Wars", "short_name": "Spark Wars", "start_url": "/tv", "scope": "/", "display": "fullscreen",
    "orientation": "landscape", "background_color": "#23104f", "theme_color": "#23104f",
    "icons": [{"src": f"/icons/{f}", "sizes": f.split("-")[1].split(".")[0] + "x" + f.split("-")[1].split(".")[0], "type": "image/png"} for f in icons],
})
lines = [f'import c{i} from "./clips/{n}";' for i, n in enumerate(names)] + [f'import i{i} from "./icons/{n}";' for i, n in enumerate(icons)]
entries = [f'"/voice/clips/{n}": c{i}' for i, n in enumerate(names)] + [f'"/icons/{n}": i{i}' for i, n in enumerate(icons)]
entries.append('"/tv.webmanifest": ' + json.dumps(manifest))
lines.append("export default {" + ", ".join(entries) + "};")
for old in ("clips.js",):
    try: os.remove(os.path.join(static, "spark", old))
    except FileNotFoundError: pass
write(os.path.join(static, "spark", "files.js"), "\n".join(lines) + "\n")
print(len(names), "voice clips,", sum(os.path.getsize(os.path.join(clips_src, n)) for n in names) // 1024, "KB")
