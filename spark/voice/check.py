"""Check the recordings: Whisper (speech recognition) transcribes every clip, and each transcript is compared with
the line it should say. Clips scoring under 0.85 are listed; listen to those (Whisper also mishears: "Vault" for
"Volt", "10" for "ten"), and re-record the bad ones with retake.py.

    python spark/voice/check.py <faster-whisper model dir, e.g. Systran/faster-whisper-base.en from Hugging Face>

Needs: pip install faster-whisper librosa, and node."""
import difflib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPARK = os.path.dirname(HERE)
# Every clip and the words it should say, from host-lines.js and voice.js.
JS = r"""global.window = global; require(process.argv[1] + '/host-lines.js'); require(process.argv[1] + '/voice/voice.js');
const N = { volt: 'Volt', blaze: 'Blaze', surge: 'Surge', nova: 'Nova' }, out = [];
for (const [k, items] of Object.entries(SPARK_LINES)) items.forEach((it, i) => { const t = it.v || it.t || it, c = SPARK_VOICE[k] && SPARK_VOICE[k][i]; if (!c) return;
  if (typeof c === 'object') for (const [tk, u] of Object.entries(c)) out.push({ key: k, i, file: process.argv[1] + '/' + u, text: t.replace(/\{team\}/g, N[tk]) });
  else out.push({ key: k, i, file: process.argv[1] + '/' + c, text: t }); });
console.log(JSON.stringify(out));"""
NUM = {"10": "ten", "30": "thirty", "3": "three"}


def clips():
    return json.loads(subprocess.run(["node", "-e", JS, SPARK], check=True, capture_output=True, text=True).stdout)


def words(s):
    return [NUM.get(w, w) for w in re.sub(r"[^a-z0-9 ]", " ", s.lower().replace("'", "")).replace("vault", "volt").split()]


def score(wanted, heard):
    return difflib.SequenceMatcher(None, words(wanted), words(heard)).ratio()


def main():
    import librosa
    from faster_whisper import WhisperModel
    model = WhisperModel(sys.argv[1], device="cpu", compute_type="int8")
    rows, bad = clips(), 0
    for r in rows:
        segs, _ = model.transcribe(librosa.load(r["file"], sr=16000)[0], language="en", beam_size=5)
        heard = " ".join(s.text.strip() for s in segs)
        sc = score(r["text"], heard)
        flag = sc < 0.85
        bad += flag
        print(("CHECK " if flag else "ok    ") + f"{sc:.2f} {os.path.basename(r['file'])}" + (f"\n        wanted: {r['text']}\n        heard:  {heard}" if flag else ""), flush=True)
    print(f"{len(rows) - bad} of {len(rows)} match")


if __name__ == "__main__":
    main()
