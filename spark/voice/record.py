"""Record Barnabas's lines for Spark Wars with Chatterbox (an open-source voice model by Resemble AI, MIT license).

    python spark/voice/record.py <chatterbox_model_dir> [--only key,key] [--exaggeration 0.75] [--slower 0.8]

Reads spark/host-lines.js (through node), records every line (the `v` version when a line has one; once per team
when it says {team}), slows it down without changing the pitch (ffmpeg's atempo), and writes MP3s to
spark/voice/clips/ and the list the game plays from to spark/voice/voice.js.

Needs: the chatterbox-tts package (with the fixes in README.md), torch, ffmpeg with lame, node, and
the original Chatterbox model files (ResembleAI/chatterbox on Hugging Face: ve.safetensors, t3_cfg.safetensors,
s3gen.safetensors, tokenizer.json, conds.pt). It runs on a CPU, at about eight seconds of work per second of speech.
Every clip carries Chatterbox's built-in (inaudible) watermark that marks it as AI-made."""
import argparse, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SPARK = os.path.dirname(HERE)
TEAMS = ["volt", "blaze", "surge", "nova"]
TEAM_NAMES = {"volt": "Volt", "blaze": "Blaze", "surge": "Surge", "nova": "Nova"}
# The voice ("option A, number 1"): Chatterbox's own voice with expression at 1.3, seeded so a re-record sounds the
# same, then slowed to 85% with ffmpeg's atempo (gentler on speech than other stretchers, so it doesn't go robotic).
SETTINGS = {"cfg_weight": 0.3, "temperature": 0.8, "seed": 11}


def lines():
    js = "global.window = global; require(process.argv[1]); console.log(JSON.stringify(window.SPARK_LINES));"
    return json.loads(subprocess.run(["node", "-e", js, os.path.join(SPARK, "host-lines.js")], check=True, capture_output=True, text=True).stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model_dir")
    ap.add_argument("--only", default="")
    ap.add_argument("--exaggeration", type=float, default=1.3)
    ap.add_argument("--slower", type=float, default=0.85, help="playback speed: 0.85 = 15 percent slower")
    a = ap.parse_args()
    import torch, torchaudio as ta
    from chatterbox.tts import ChatterboxTTS
    torch.set_num_threads(os.cpu_count() or 4)
    model = ChatterboxTTS.from_local(a.model_dir, "cpu")
    out_dir = os.path.join(HERE, "clips")
    os.makedirs(out_dir, exist_ok=True)
    only = set(filter(None, a.only.split(",")))
    voice_js = os.path.join(HERE, "voice.js")
    table = {}
    if os.path.exists(voice_js) and only:  # keep what was recorded before
        m = re.search(r"window\.SPARK_VOICE = (\{.*\});", open(voice_js).read(), re.S)
        if m: table = json.loads(m.group(1))

    def record(text, name):
        torch.manual_seed(SETTINGS["seed"])
        wav = model.generate(text, exaggeration=a.exaggeration, cfg_weight=SETTINGS["cfg_weight"], temperature=SETTINGS["temperature"])
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw.wav")
            ta.save(raw, wav, model.sr)
            # Slower without a pitch change, quiet edges trimmed, small mono MP3.
            subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", raw, "-af",
                            f"atempo={a.slower},silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                            "silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                            "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "48k", os.path.join(out_dir, name)], check=True)
        print(name, flush=True)
        return f"voice/clips/{name}"

    for key, items in lines().items():
        if only and key not in only:
            continue
        row = []
        for i, item in enumerate(items):
            text = item.get("v") or item.get("t") if isinstance(item, dict) else item
            slug = re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-")
            if "{team}" in text:
                row.append({t: record(text.replace("{team}", TEAM_NAMES[t]), f"{slug}-{i}-{t}.mp3") for t in TEAMS})
            elif re.search(r"\{\w+\}", text):
                print(f"skipped {key}[{i}]: it names someone or a number and has no `v` version", file=sys.stderr)
                row.append(None)
            else:
                row.append(record(text, f"{slug}-{i}.mp3"))
        table[key] = row
    with open(voice_js, "w") as f:
        f.write("/* Barnabas's recorded lines, made by spark/voice/record.py from spark/host-lines.js (do not edit by hand).\n"
                "   { key: [url of line 0, ...] }; a line that names a team has { volt, blaze, surge, nova }. */\n")
        f.write("window.SPARK_VOICE = " + json.dumps(table, indent=1) + ";\n")
    print("wrote", voice_js)


if __name__ == "__main__":
    main()
