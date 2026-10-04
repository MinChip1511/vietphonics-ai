"""Second opinions on the PAPL-NCCF decision.

PAPL-NCCF receives the canonical phones as input, so when the audio is only roughly right it tends
to "repair" its output to match them (e.g. "xi đạp" or even English "she dap" decoded as "xe đạp"
and scored 100). Two independent signals are added on top of its decision:

1. Speech-to-text of the recording (wav2vec2 CTC head) compared with the target word.
   A mismatch caps the score.
2. Per-phone confidence: the posterior probability the model gives to each canonical phone on the
   frames CTC forced-alignment assigns to it. A correct-looking phone with a low posterior becomes
   "UNSURE" and earns partial credit.

All thresholds below are starting values chosen from synthetic voices, not from children's speech.
Tune them against real recordings (the backend logs transcript and phone confidences per request).
"""
import difflib
import re
import unicodedata

import torch

from .phone_hints import hint

# --- thresholds -----------------------------------------------------------------------------
TEXT_MATCH_THRESHOLD = 0.85   # similarity (0..1) of transcript vs target word to count as a match
OFF_TARGET_THRESHOLD = 0.5    # below this the child said something else entirely: not scored
ASR_MISMATCH_CAP = 74         # max score when the transcript does not match (stays in the "nearly" band)
UNSURE_CONFIDENCE = 0.75      # a canonical phone with a posterior below this is "UNSURE"


def normalize_text(text):
    """Lowercase, NFC-normalise, drop punctuation and collapse whitespace."""
    text = unicodedata.normalize("NFC", str(text or "")).lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _fold(text):
    # The speech-to-text model writes s/x from word knowledge, not from the sound, so the two are
    # not told apart here (the S-vs-x contrast is judged by the phoneme model only).
    return normalize_text(text).replace("x", "s")


def text_similarity(target, transcript):
    """Similarity in [0, 1] between the target word and the transcript (1.0 = identical)."""
    a, b = _fold(target), _fold(transcript)
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def transcript_matches(target, transcript, threshold=TEXT_MATCH_THRESHOLD):
    return text_similarity(target, transcript) >= threshold


def is_off_target(transcript, target_word):
    """True when speech-to-text exists and is a different word/sentence (or nothing intelligible)."""
    if transcript is None or not normalize_text(target_word):
        return False
    return text_similarity(target_word, transcript) < OFF_TARGET_THRESHOLD


def cap_score_for_transcript(score, transcript, target_word):
    """Cap the score when a transcript exists and does not match the target word."""
    if transcript is None or not normalize_text(target_word):
        return score
    if transcript_matches(target_word, transcript):
        return score
    return min(score, ASR_MISMATCH_CAP)


def phone_confidences(log_probs, target_ids):
    """Per-phone confidence for the canonical sequence.

    log_probs: (T, V) frame log-probabilities (blank id 0). target_ids: canonical phone ids.
    Runs CTC forced alignment of the canonical phones to the frames and returns, for each phone,
    the mean posterior over its aligned frames. Returns None when the audio is too short to align.
    """
    import torchaudio.functional as taf

    lp = log_probs.detach().float().cpu()
    if lp.dim() != 2 or len(target_ids) == 0:
        return None
    repeats = sum(1 for i in range(1, len(target_ids)) if target_ids[i] == target_ids[i - 1])
    if lp.shape[0] < len(target_ids) + repeats:
        return None
    targets = torch.tensor([list(target_ids)], dtype=torch.int32)
    try:
        aligned, scores = taf.forced_align(lp.unsqueeze(0), targets, blank=0)
    except Exception:  # alignment impossible for this audio/sequence
        return None
    spans = taf.merge_tokens(aligned[0], scores[0].exp(), blank=0)
    if len(spans) != len(target_ids):
        return None
    return [float(span.score) for span in spans]


def mark_unsure_phones(elsa_rows, confidences):
    """Attach `confidence` to every row of a canonical phone; turn correct-but-doubtful ones into UNSURE.

    `confidences` follows the canonical phone order, which is the order of rows that have a
    canonical_token (alignment keeps the reference order). No-op when confidences is None.
    """
    if confidences is None:
        return elsa_rows
    index = 0
    for row in elsa_rows:
        if row.get("canonical_token") is None:
            continue
        if index >= len(confidences):
            break
        confidence = round(float(confidences[index]), 3)
        index += 1
        row["confidence"] = confidence
        if row.get("is_correct") and confidence < UNSURE_CONFIDENCE:
            row["status"] = "UNSURE"
            row["is_correct"] = False
            row["elsa_feedback"] = "Chưa chắc chắn!"
            h = hint(row.get("canonical_token"))
            row["mouth_tip"] = f"Cá Xanh chưa nghe rõ {h['name']} (như trong “{h['example']}”). {h['tip']}"
    return elsa_rows
