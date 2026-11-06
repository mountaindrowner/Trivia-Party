"""Builds the pages each party-game site hands out, into huddle/server/static/<site>/ (not committed):
  holy/phone.html   the Holy Huddle join page          holy/tv.html   all of Trivia Holy Party, for the TV at /tv
  spark/phone.html  the Spark Wars join page           spark/tv.html  Spark Wars, for the TV at /tv
The phone page is the same code for both, with its own look (<html data-game="...">).
Run before `npx wrangler deploy` (Holy Huddle) or `npx wrangler deploy --env spark` (Spark Wars), or `wrangler dev`."""
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
         .replace('content="#2b1a7a"', 'content="#07060f"')
         .replace("family=Lilita+One&", "family=Bungee&family=Lilita+One&"))
assert 'data-game="spark"' in spark and "Bungee" in spark
write(os.path.join(static, "spark", "phone.html"), spark)

# Trivia Holy Party: the whole game, for the TV.
subprocess.run([sys.executable, os.path.join(root, "tools", "build.py"), os.path.join(static, "holy", "tv.html")], check=True)

# Spark Wars: spark/index.html with its css and js (and the shared question files) inlined.
html = read(root, "spark", "index.html")
html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', lambda m: "<style>\n" + read(root, "spark", m.group(1)) + "\n</style>", html)
html = re.sub(r'<script src="([^"]+\.js)"></script>',
              lambda m: "<script>\n" + read(root, "spark", m.group(1)).replace("</script", "<\\/script") + "\n</script>", html)
assert not re.search(r'(href|src)="[^"]+\.(css|js)"', html), "a Spark Wars file was not inlined"
write(os.path.join(static, "spark", "tv.html"), html)
