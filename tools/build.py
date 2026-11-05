"""Builds a single-file copy of the game: every css/ and js/ file inlined into index.html.
Usage: python3 tools/build.py [out.html]   (default: dist/trivia-holy-party.html)
The single file is what goes to itch.io (zipped) and to the Holy Huddle server's /tv page."""
import os, re, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "dist", "trivia-holy-party.html")
html = open(os.path.join(root, "index.html"), encoding="utf-8").read()

def css(m):
    href, rest = m.group(1), m.group(2)
    idm = re.search(r'id="([^"]+)"', rest)
    tag = f'<style id="{idm.group(1)}">' if idm else "<style>"
    return tag + "\n" + open(os.path.join(root, href), encoding="utf-8").read() + "\n</style>"

html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)"([^>]*)>', css, html)
html = re.sub(r'<script src="(js/[^"]+)"></script>',
              lambda m: "<script>\n" + open(os.path.join(root, m.group(1)), encoding="utf-8").read().replace("</script", "<\\/script") + "\n</script>", html)
assert 'href="css/' not in html and 'src="js/' not in html, "a file was not inlined"
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, "w", encoding="utf-8").write(html)
print(out, len(html), "bytes")
