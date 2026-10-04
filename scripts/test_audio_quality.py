"""Unit tests for the silence/noise gate (synthetic signals only, plain asserts)."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.app.audio_quality import analyze_signal  # noqa: E402

SR = 16000
T = np.arange(SR * 2) / SR
rng = np.random.default_rng(0)
CASES = []


def case(fn):
    CASES.append(fn)
    return fn


def speech_like():
    return (np.sin(2 * np.pi * 200 * T) * np.clip(np.sin(2 * np.pi * 1.5 * T), 0, 1) * 0.2).astype(np.float32)


@case
def digital_silence_is_not_speech():
    assert analyze_signal(np.zeros(SR * 2, np.float32), SR)["status"] == "silent"


@case
def quiet_room_hiss_is_not_speech():
    assert analyze_signal((rng.standard_normal(SR * 2) * 1e-4).astype(np.float32), SR)["status"] == "silent"


@case
def clean_speech_is_ok():
    out = analyze_signal(speech_like() + (rng.standard_normal(SR * 2) * 1e-3).astype(np.float32), SR)
    assert out["status"] == "ok" and not out["warning"], out


@case
def loud_constant_background_is_noisy():
    fan = (rng.standard_normal(SR * 2) * 0.03).astype(np.float32)
    assert analyze_signal(speech_like() + fan, SR)["status"] == "noisy"


@case
def music_under_speech_is_noisy():
    music = (np.sin(2 * np.pi * 440 * T) * 0.1).astype(np.float32)
    assert analyze_signal(music + speech_like() * 0.5, SR)["status"] == "noisy"


@case
def moderate_noise_only_warns():
    hum = (rng.standard_normal(SR * 2) * 0.012).astype(np.float32)
    out = analyze_signal(speech_like() + hum, SR)
    assert out["status"] == "ok" and out["warning"], out


@case
def too_short_is_silent():
    assert analyze_signal(np.zeros(100, np.float32), SR)["status"] == "silent"


if __name__ == "__main__":
    failed = 0
    for fn in CASES:
        try:
            fn()
            print(f"ok    {fn.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL  {fn.__name__}: {exc}")
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    sys.exit(1 if failed else 0)
