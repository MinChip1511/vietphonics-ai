import io
import math
import numpy as np
from scipy.signal import resample_poly, medfilt

try:
    import torch
    import torch.nn.functional as F
    import torchaudio
except ImportError:
    torch = None
    F = None
    torchaudio = None

try:
    import soundfile as sf
except ImportError:
    sf = None

SAMPLE_RATE = 16000
FRAME_SHIFT_MS = 20.0

def decode_audio_bytes(raw_bytes, target_sr=SAMPLE_RATE):
    """
    Decodes audio bytes (WAV, FLAC, OGG) to 16kHz mono float32 numpy array.
    """
    if sf is None:
        raise RuntimeError("soundfile library is not installed")
    
    bio = io.BytesIO(raw_bytes)
    wav, sr = sf.read(bio, dtype="float32", always_2d=False)
    wav = np.asarray(wav, dtype=np.float32)
    
    # Stereo to mono
    if wav.ndim == 2:
        wav = wav.mean(axis=1)
        
    # Resample if needed
    if sr != target_sr:
        g = math.gcd(int(sr), int(target_sr))
        wav = resample_poly(wav, target_sr // g, sr // g).astype(np.float32)
        sr = target_sr
        
    # Normalize peak
    peak = np.max(np.abs(wav)) if len(wav) else 0
    if peak > 1.0:
        wav = wav / peak
    return wav, sr


def frame_signal(wav, frame_length, frame_shift):
    wav = np.asarray(wav, dtype=np.float32)
    if len(wav) < frame_length:
        wav = np.pad(wav, (0, frame_length - len(wav)))
    n = 1 + max(0, math.ceil((len(wav) - frame_length) / frame_shift))
    total = (n - 1) * frame_shift + frame_length
    if len(wav) < total:
        wav = np.pad(wav, (0, total - len(wav)))
    shape = (n, frame_length)
    strides = (wav.strides[0] * frame_shift, wav.strides[0])
    return np.lib.stride_tricks.as_strided(wav, shape=shape, strides=strides).copy()


def acoustic_81(wav, sr=SAMPLE_RATE):
    """
    80 Kaldi fbank + 1 log-energy = 81 dimensions, normalized by mean/std.
    """
    if torch is None or torchaudio is None:
        raise RuntimeError("torch / torchaudio not available")

    x = torch.from_numpy(wav).float().unsqueeze(0)
    fb = torchaudio.compliance.kaldi.fbank(
        x,
        sample_frequency=sr,
        frame_length=25.0,
        frame_shift=FRAME_SHIFT_MS,
        num_mel_bins=80,
        use_energy=False,
        dither=0.0,
        snip_edges=False
    )
    flen = int(round(0.025 * sr))
    fshift = int(round(FRAME_SHIFT_MS / 1000 * sr))
    frames = frame_signal(wav, flen, fshift)
    loge = torch.from_numpy(
        np.log(np.maximum((frames ** 2).sum(axis=1), 1e-10)).astype(np.float32)
    ).unsqueeze(-1)

    T = min(len(fb), len(loge))
    feat = torch.cat([fb[:T], loge[:T]], dim=-1)
    mean = feat.mean(0, keepdim=True)
    std = feat.std(0, keepdim=True).clamp_min(1e-5)
    return (feat - mean) / std


def nccf_pitch(wav, sr=SAMPLE_RATE, min_f0=50.0, max_f0=500.0, voiced_threshold=0.30):
    """
    Normalized Cross-Correlation Function (NCCF) pitch estimator with median smoothing.
    max_f0=500.0 is tuned specifically for child speech in VietPhonics.
    """
    if torch is None:
        raise RuntimeError("torch not available")

    frame_len = int(round(0.025 * sr))
    frame_shift = int(round(FRAME_SHIFT_MS / 1000 * sr))
    frames = frame_signal(wav, frame_len, frame_shift)
    frames = frames - frames.mean(axis=1, keepdims=True)

    min_lag = max(1, int(sr / max_f0))
    max_lag = min(frame_len - 2, int(sr / min_f0))
    f0 = np.zeros(len(frames), dtype=np.float32)

    for i, frame in enumerate(frames):
        best_c = -1.0
        best_lag = 0
        for lag in range(min_lag, max_lag + 1):
            a = frame[:-lag]
            b = frame[lag:]
            den = np.sqrt(np.dot(a, a) * np.dot(b, b)) + 1e-8
            cc = float(np.dot(a, b) / den)
            if cc > best_c:
                best_c = cc
                best_lag = lag
        if best_c >= voiced_threshold and best_lag > 0:
            f0[i] = sr / best_lag

    if len(f0) >= 3:
        f0 = medfilt(f0, kernel_size=3).astype(np.float32)

    voiced = f0 > 0
    out = np.zeros_like(f0)
    if voiced.any():
        z = np.log(f0[voiced])
        out[voiced] = (z - z.mean()) / max(float(z.std()), 1e-5)

    return torch.from_numpy(out).unsqueeze(-1)


def resize_time(x, target_T):
    if x.shape[0] == target_T:
        return x
    return F.interpolate(
        x.T.unsqueeze(0),
        size=target_T,
        mode="linear",
        align_corners=False
    ).squeeze(0).T.contiguous()
