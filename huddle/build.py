"""Builds the pages the Holy Huddle server hands out, into huddle/server/static/ (not committed):
  phone.html  the join page, with its CSS and JS inlined
  tv.html     the whole game in one file, for opening on the TV at /tv
Run before `npx wrangler deploy` or `npx wrangler dev`."""
import os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
static = os.path.join(here, "server", "static")
os.makedirs(static, exist_ok=True)

phone = os.path.join(here, "phone")
html = open(os.path.join(phone, "index.html"), encoding="utf-8").read()
html = html.replace('<link rel="stylesheet" href="phone.css">', "<style>\n" + open(os.path.join(phone, "phone.css"), encoding="utf-8").read() + "</style>")
html = html.replace('<script src="phone.js"></script>', "<script>\n" + open(os.path.join(phone, "phone.js"), encoding="utf-8").read() + "</script>")
assert "phone.css" not in html and 'src="phone.js"' not in html
open(os.path.join(static, "phone.html"), "w", encoding="utf-8").write(html)
print("phone.html", len(html), "bytes")

subprocess.run([sys.executable, os.path.join(os.path.dirname(here), "tools", "build.py"), os.path.join(static, "tv.html")], check=True)
