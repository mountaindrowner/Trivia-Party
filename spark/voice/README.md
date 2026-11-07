# Barnabas's voice

Barnabas's lines are written once, in `../host-lines.js`, for both his speech bubble and his voice. His voice is
recorded ahead of time with **Chatterbox** (open source, by Resemble AI, MIT license), then played by the game:

- `record.py` records every line into `clips/` (small MP3s) and writes `voice.js`, the list the game plays from.
- When a line has no recording (or `voice.js` is empty), the TV uses the device's own voice instead.
- Lines with someone's name or a number in them have a `v` version without it, since a recording can't know who
  joined. Lines that name a team are recorded once per team.

## The voice

Chatterbox's own built-in voice on the original Chatterbox model, with expression ("exaggeration") at 0.75, then
slowed to 80% speed without changing the pitch. Snark comes from the writing; punctuation (commas, periods, "...")
gives him his pauses.

## Recording

On any computer (no graphics card needed: about eight seconds of work per second of speech):

```
python3 -m venv cbenv && cbenv/bin/pip install chatterbox-tts "setuptools<81"
# the original model, from huggingface.co/ResembleAI/chatterbox:
#   ve.safetensors  t3_cfg.safetensors  s3gen.safetensors  tokenizer.json  conds.pt   (about 3.2 GB)
cbenv/bin/python spark/voice/record.py path/to/model            # everything
cbenv/bin/python spark/voice/record.py path/to/model --only double,lead   # just some lines
```

It also needs `ffmpeg` (with rubberband and lame) and `node`.

Notes from setting it up (November 2026): `chatterbox-tts` 0.1.7 on PyPI is older than the GitHub code (the
newer files are on github.com/resemble-ai/chatterbox), and its watermark library needs `setuptools` below 81.
All model files are `.safetensors` (data only) apart from the small `conds.pt`, which the code opens in PyTorch's
data-only mode. Every clip carries Chatterbox's inaudible watermark marking it as AI-made.
