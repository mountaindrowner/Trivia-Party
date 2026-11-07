"""Re-record clips that came out garbled: up to five takes each (different seeds), Whisper scores each against the
script, and the clearest one replaces the clip. Same voice and processing as record.py.
python spark/voice/retake.py <chatterbox model dir> <faster-whisper model dir> jointeam-1-volt.mp3 [more clip names]
(A full record.py run records everything again with its usual seed, so run the retakes again after one.)"""
import os, subprocess, sys, tempfile
import torch, torchaudio as ta, librosa
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel
torch.set_num_threads(4)
cb_dir, wh_dir, *files = sys.argv[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from check import clips, score  # noqa: E402  (the same list of clips and their words, and the same scoring)
rows = {os.path.basename(r["file"]): r for r in clips()}
tts = ChatterboxTTS.from_local(cb_dir, "cpu")
asr = WhisperModel(wh_dir, device="cpu", compute_type="int8")
for name in files:
    r = rows[name]
    best = (-1, None, "")
    for seed in (21, 31, 41, 51, 61):
        torch.manual_seed(seed)
        wav = tts.generate(r["text"], exaggeration=1.3, cfg_weight=0.3, temperature=0.8)
        tmp = tempfile.mkdtemp()
        raw, mp3 = os.path.join(tmp, "raw.wav"), os.path.join(tmp, "take.mp3")
        ta.save(raw, wav, tts.sr)
        subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", raw, "-af",
                        "atempo=0.85,silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
                        "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "48k", mp3], check=True)
        segs, _ = asr.transcribe(librosa.load(mp3, sr=16000)[0], language="en", beam_size=5)
        heard = " ".join(s.text.strip() for s in segs)
        sc = score(r["text"], heard)
        if sc > best[0]: best = (sc, mp3, heard)
        if sc >= 0.95: break
    subprocess.run(["cp", best[1], r["file"]], check=True)
    print(f"{best[0]:.2f} {name}\n      wanted: {r['text']}\n      heard:  {best[2]}", flush=True)
