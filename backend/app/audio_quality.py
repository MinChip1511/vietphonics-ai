"""Signal-level checks run before any scoring: silence and background noise.

The neural model happily "repairs" silence or noise toward the canonical phones and returns a
score, so the recording itself is judged first from its short-time energy (numpy only, cheap).

Thresholds are starting values (dBFS = decibels relative to full scale, 20 ms frames); tune them
with real classroom/home recordings. The browser recorder disables auto-gain and noise
suppression so these levels stay meaningful.
"""
import numpy as np

FRAME_SECONDS = 0.02
SILENCE_PEAK_DB = -48.0        # loudest 5% of frames quieter than this: nobody spoke
MIN_SPEECH_SECONDS = 0.12      # time clearly above the noise floor needed to count as speech
NOISE_FLOOR_WARN_DB = -42.0    # constant background above this is noticeable
NOISE_FLOOR_BLOCK_DB = -34.0   # ... and this loud makes any score meaningless
SNR_WARN_DB = 14.0
SNR_BLOCK_DB = 7.0


def _frame_db(wav, sample_rate):
    size = max(1, int(sample_rate * FRAME_SECONDS))
    n = len(wav) // size
    if n == 0:
        return np.array([], dtype=np.float32)
    frames = wav[: n * size].reshape(n, size)
    rms = np.sqrt(np.mean(frames.astype(np.float64) ** 2, axis=1) + 1e-12)
    return (20.0 * np.log10(rms + 1e-9)).astype(np.float32)


def analyze_signal(wav, sample_rate):
    """Returns {"status": "ok"|"silent"|"noisy", "warning": bool, metrics...}."""
    levels = _frame_db(np.asarray(wav, dtype=np.float32), sample_rate)
    if levels.size < 5:
        return {"status": "silent", "warning": False, "peak_db": None, "noise_floor_db": None, "snr_db": None}

    peak = float(np.percentile(levels, 95))
    floor = float(np.percentile(levels, 10))
    snr = peak - floor
    speech_frames = int(np.sum(levels > max(floor + 8.0, SILENCE_PEAK_DB)))
    speech_seconds = speech_frames * FRAME_SECONDS
    metrics = {
        "peak_db": round(peak, 1),
        "noise_floor_db": round(floor, 1),
        "snr_db": round(snr, 1),
        "speech_seconds": round(speech_seconds, 2),
    }

    if peak < SILENCE_PEAK_DB:
        return {"status": "silent", "warning": False, **metrics}
    if floor > NOISE_FLOOR_BLOCK_DB or snr < SNR_BLOCK_DB:
        return {"status": "noisy", "warning": True, **metrics}
    if speech_seconds < MIN_SPEECH_SECONDS:
        return {"status": "silent", "warning": False, **metrics}
    warn = floor > NOISE_FLOOR_WARN_DB or snr < SNR_WARN_DB
    return {"status": "ok", "warning": warn, **metrics}
