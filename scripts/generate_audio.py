"""Pre-generates the sample audio the app plays (one normal and one slow file per text) with the macOS
Vietnamese voice "Linh", into frontend/public/audio/ plus a manifest the app uses to find them.

    backend/venv/bin/python scripts/generate_audio.py                  # lesson texts from the seed data
    backend/venv/bin/python scripts/generate_audio.py --api https://vietphonics-ai.onrender.com
                                                                       # lesson texts as the live site has them now
    backend/venv/bin/python scripts/generate_audio.py --force          # regenerate every file

Needs macOS (`say`, `afconvert`). Files that already exist are kept, so adding a lesson word only
generates the new clips. The key of a text is its normalised form (see normalize() here and in
frontend/src/services/audioService.js: they must stay identical).
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
OUT = ROOT / "frontend" / "public" / "audio"
VOICE = "Linh"
RATES = {"": 135, "-slow": 95}  # words per minute for the normal and the slow clip

# Fixed sentences the interface speaks (keep in sync with the views that call speak()).
UI_TEXTS = [
    "Chào bé yêu! Mình cùng học chữ cái nha!",
    "Xin chào ba mẹ và các bé! VietPhonics AI giúp bé luyện đọc và phát âm tiếng Việt qua những bài học ngắn, vui nhộn, có trí tuệ nhân tạo lắng nghe và khen ngợi bé mỗi ngày.",
    "Trời trong xanh", "Bé đi học", "Xin chào bạn",
    "Oa! Bé phát âm siêu quá đi mất! Thật chuẩn giọng luôn.",
]


def normalize(text: str) -> str:
    """Same rule as normalizeSpeech() in audioService.js."""
    text = unicodedata.normalize("NFC", str(text)).lower()
    text = re.sub(r"[“”\"'.!?;:…]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def slug(key: str) -> str:
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]


def lesson_texts(lessons):
    texts = set()
    for lesson in lessons:
        for word in lesson.get("words", []):
            texts.add(word["word"])
        texts.update(lesson.get("warmup", []))
        texts.update(lesson.get("syllables", []))
        for pair in lesson.get("minimalPairs", []):
            texts.update([pair["word1"], pair["word2"]])
        for sentence in lesson.get("sentences", []):
            texts.add(sentence["sentence"])
        game = lesson.get("discriminationGame") or {}
        texts.update([game.get("prompt", ""), *game.get("options", [])])
    return texts


def phone_texts():
    """What the result screen reads for a sound: its child-friendly name and its example word."""
    from backend.app import phone_hints

    texts = set()
    for token in [*phone_hints._PHONES, *phone_hints._TONE_HINTS]:
        h = phone_hints.hint(token)
        texts.update([h["name"], h["example"]])
    texts.update(phone_hints.hint(None)["name"] for _ in [0])
    return {t for t in texts if t and t != "âm này"} | {"âm này"}


def load_lessons(api):
    if api:
        with urllib.request.urlopen(api.rstrip("/") + "/api/lessons", timeout=60) as response:
            return json.load(response)["lessons"]
    from backend.app.lessons_data import LESSONS

    return LESSONS


def synthesize(text, rate, target: Path):
    with tempfile.TemporaryDirectory() as tmp:
        aiff = Path(tmp) / "clip.aiff"
        subprocess.run(["say", "-v", VOICE, "-r", str(rate), "-o", str(aiff), text], check=True)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", str(aiff), str(target)], check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", help="read the lessons from a running API instead of the seed data")
    parser.add_argument("--force", action="store_true", help="regenerate files that already exist")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    texts = {t.strip() for t in lesson_texts(load_lessons(args.api)) | set(UI_TEXTS) | phone_texts() if t and t.strip()}
    manifest, made = {}, 0
    for text in sorted(texts, key=normalize):
        key = normalize(text)
        if not key or key in manifest:
            continue
        manifest[key] = slug(key)
        for suffix, rate in RATES.items():
            target = OUT / f"{manifest[key]}{suffix}.m4a"
            if args.force or not target.exists():
                synthesize(text, rate, target)
                made += 1
    (OUT / "manifest.json").write_text(json.dumps({"voice": VOICE, "clips": manifest}, ensure_ascii=False, indent=0, sort_keys=True))
    # Remove clips of texts that no longer exist, so the folder never grows with dead files.
    wanted = {f"{s}{suffix}.m4a" for s in manifest.values() for suffix in RATES}
    stale = [p for p in OUT.glob("*.m4a") if p.name not in wanted]
    for p in stale:
        p.unlink()
    total = sum(p.stat().st_size for p in OUT.glob("*.m4a"))
    print(f"{len(manifest)} texts, {made} clips generated, {len(stale)} removed, {total / 1024:.0f} KB in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
