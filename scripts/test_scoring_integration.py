"""Integration test of the real scoring pipeline (PAPL-NCCF + speech-to-text + confidences).

Uses macOS `say` (Vietnamese voice Linh, English voice Samantha) to make audio, so it only runs on macOS.
Run from the repo root:  backend/venv/bin/python scripts/test_scoring_integration.py
Synthetic voices are NOT children's speech: this checks the wiring and the known false-accept cases,
it does not calibrate the thresholds.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform != "darwin":
    print("skipped: needs macOS `say`")
    sys.exit(0)

from backend.app import main as app  # noqa: E402

app.try_init_model()
assert app.AI_STATE["model_loaded"], "model did not load"
tmp = Path(tempfile.mkdtemp())


def speak(voice, text, name):
    aiff, wav = tmp / f"{name}.aiff", tmp / f"{name}.wav"
    subprocess.run(["say", "-v", voice, text, "-o", str(aiff)], check=True, timeout=30)
    subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", str(aiff), str(wav)], check=True)
    return wav.read_bytes()


XE_DAP = ("s E _1 d a_X p _6b", "Xe đạp")
results = {}
failures = []


def silence(seconds=2):
    import io
    import wave
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000 * seconds)
    return buf.getvalue()


def check(name, voice, text, canonical, target, expect):
    audio = silence() if text is None else speak(voice, text, name)
    r = app.analyze_audio_neural(audio, canonical, target)
    ok = expect(r)
    results[name] = r["score"]
    print(f"{'ok  ' if ok else 'FAIL'}  {name:18s} score={r['score']:3d} heard={r['asr_transcript']!r}")
    if not ok:
        failures.append(name)


check("xe đạp (đúng)", "Linh", "xe đạp", *XE_DAP, lambda r: r["score"] == 100 and r["asr_match"] is True)
check("xi đạp (sai vần)", "Linh", "xi đạp", *XE_DAP, lambda r: r["score"] <= 74 and r["asr_match"] is False)
check("si đạp", "Linh", "si đạp", *XE_DAP, lambda r: r["score"] <= 74)
check("she dap (tiếng Anh)", "Samantha", "she dap", *XE_DAP, lambda r: r["score"] <= 74 and r["asr_match"] is False)
check("xanh (đúng)", "Linh", "xanh", "s a J _1", "xanh", lambda r: r["score"] == 100)
check("im lặng", None, None, *XE_DAP, lambda r: r["score"] <= 40)

print(f"\n{len(results) - len(failures)}/{len(results)} passed")
sys.exit(1 if failures else 0)
