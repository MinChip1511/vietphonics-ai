"""Tests for backend/app/verification.py: second opinions on the PAPL-NCCF decision
(speech-to-text check of the target word, and per-phone confidence).

Run from the repo root:  backend/venv/bin/python scripts/test_verification.py
"""
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.alignment import (  # noqa: E402
    needleman_wunsch, map_alignment_to_elsa_format, compute_pronunciation_score, generate_letter_highlights,
)
from backend.app.verification import (  # noqa: E402
    ASR_MISMATCH_CAP, normalize_text, text_similarity, transcript_matches, phone_confidences,
    mark_unsure_phones, cap_score_for_transcript, is_off_target,
)

CASES = []


def case(fn):
    CASES.append(fn)
    return fn


@case
def normalize_lowercases_strips_punctuation_and_spaces():
    assert normalize_text("  Xe  Đạp! ") == "xe đạp"
    assert normalize_text("Ngôi sao.") == "ngôi sao"
    assert normalize_text("") == ""


@case
def identical_text_is_similarity_one():
    assert text_similarity("xe đạp", "Xe đạp") == 1.0


@case
def wrong_vowel_is_not_a_match():
    # The real case: "xi đạp" was transcribed "si đạp" and the target is "xe đạp".
    assert text_similarity("xe đạp", "si đạp") < 0.85
    assert not transcript_matches("xe đạp", "si đạp")


@case
def s_and_x_are_not_told_apart_by_speech_to_text():
    # The speech-to-text model writes s/x by word knowledge, not by sound: do not penalise it.
    assert text_similarity("ngôi sao", "ngôi xao") == 1.0
    assert transcript_matches("xe đạp", "se đạp")


@case
def unrelated_speech_is_far_below_the_threshold():
    assert text_similarity("xe đạp", "sin ràc") < 0.5
    assert text_similarity("xe đạp", "") == 0.0


@case
def one_small_slip_in_a_long_phrase_still_matches():
    assert transcript_matches("bé đọc sách", "bé đọc sách")
    assert transcript_matches("trăng sáng trên trời", "trăng sáng trên trời")


def _logprobs(frames):
    """frames: list of dicts {token_id: prob}; remaining mass goes to blank (id 0)."""
    vocab = 6
    rows = []
    for f in frames:
        p = torch.full((vocab,), 1e-4)
        for k, v in f.items():
            p[k] = v
        p[0] = max(1e-4, 1.0 - sum(f.values()))
        rows.append(p / p.sum())
    return torch.stack(rows).log()


@case
def confident_phones_get_high_confidence():
    lp = _logprobs([{1: 0.95}, {1: 0.95}, {0: 0.99}, {2: 0.9}, {2: 0.9}, {0: 0.99}, {3: 0.92}, {0: 0.99}])
    conf = phone_confidences(lp, [1, 2, 3])
    assert len(conf) == 3 and all(c > 0.8 for c in conf), conf


@case
def an_uncertain_phone_gets_a_low_confidence():
    lp = _logprobs([{1: 0.95}, {1: 0.95}, {0: 0.99}, {2: 0.55, 4: 0.4}, {2: 0.55, 4: 0.4}, {0: 0.99}, {3: 0.92}, {0: 0.99}])
    conf = phone_confidences(lp, [1, 2, 3])
    assert conf[1] < 0.75 < conf[0] and conf[2] > 0.8, conf


@case
def too_short_audio_returns_none_instead_of_crashing():
    lp = _logprobs([{1: 0.9}, {2: 0.9}])
    assert phone_confidences(lp, [1, 2, 3, 4]) is None


@case
def repeated_phone_in_the_target_is_handled():
    lp = _logprobs([{1: 0.9}, {0: 0.99}, {1: 0.9}, {0: 0.99}, {2: 0.9}, {0: 0.99}])
    conf = phone_confidences(lp, [1, 1, 2])
    assert conf is not None and len(conf) == 3


def _rows(ref, hyp, word="x"):
    rows, _ = map_alignment_to_elsa_format(word, needleman_wunsch(ref.split(), hyp.split()))
    return rows


@case
def low_confidence_correct_phone_becomes_unsure():
    rows = _rows("s E _1 d a_X p _6b", "s E _1 d a_X p _6b")
    mark_unsure_phones(rows, [0.97, 0.69, 0.95, 0.9, 0.9, 0.9, 0.9])
    assert rows[1]["status"] == "UNSURE" and rows[1]["is_correct"] is False
    assert rows[1]["confidence"] == 0.69
    assert all(r["status"] == "CORRECT" for i, r in enumerate(rows) if i != 1)
    assert all("confidence" in r for r in rows)


@case
def confidences_follow_canonical_order_even_with_extra_and_missing_phones():
    rows = _rows("s E _1 d a_X", "s E _1 k d")  # a_X missing (vs d), extra k handled by the aligner
    canonical_rows = [r for r in rows if r["canonical_token"] is not None]
    mark_unsure_phones(rows, [0.9] * len(canonical_rows))
    assert [r["confidence"] for r in canonical_rows] == [0.9] * len(canonical_rows)
    assert all("confidence" not in r for r in rows if r["canonical_token"] is None)


@case
def wrong_phones_are_left_alone():
    rows = _rows("s E _1", "s i _1")
    mark_unsure_phones(rows, [0.9, 0.2, 0.9])
    assert rows[1]["status"] == "SUBSTITUTION"


@case
def none_confidences_change_nothing():
    rows = _rows("s E _1", "s E _1")
    mark_unsure_phones(rows, None)
    assert all(r["status"] == "CORRECT" for r in rows)


@case
def unsure_phones_earn_partial_credit():
    rows = _rows("s E _1 d a_X p _6b", "s E _1 d a_X p _6b")
    full = compute_pronunciation_score(rows)
    mark_unsure_phones(rows, [0.97, 0.5, 0.95, 0.9, 0.9, 0.9, 0.9])
    partial = compute_pronunciation_score(rows)
    assert full == 100 and 70 <= partial < 100, (full, partial)


@case
def unsure_phone_is_highlighted_amber_not_red():
    rows = _rows("s E _1 d a_X p _6b", "s E _1 d a_X p _6b")
    mark_unsure_phones(rows, [0.97, 0.5, 0.95, 0.9, 0.9, 0.9, 0.9])
    colors = {seg["color"] for seg in generate_letter_highlights("xe đạp", rows)}
    assert "amber" in colors and "red" not in colors, colors


@case
def transcript_mismatch_caps_the_score():
    assert cap_score_for_transcript(100, "si đạp", "xe đạp") == ASR_MISMATCH_CAP
    assert cap_score_for_transcript(100, "xe đạp", "xe đạp") == 100
    assert cap_score_for_transcript(60, "si đạp", "xe đạp") == 60


@case
def no_transcript_means_no_cap():
    assert cap_score_for_transcript(100, None, "xe đạp") == 100
    assert cap_score_for_transcript(100, "si đạp", "") == 100


@case
def different_word_or_language_is_off_target():
    # B1 / M11: "đi chơ" for "Ngôi sao", English, or nothing intelligible must not be scored.
    assert is_off_target("đi chơ", "Ngôi sao")
    assert is_off_target("hello how are you", "Ngôi sao")
    assert is_off_target("", "Ngôi sao")


@case
def near_miss_and_correct_words_are_not_off_target():
    assert not is_off_target("ngôi sao", "Ngôi sao")
    assert not is_off_target("ngôi xao", "Ngôi sao")  # s/x folded
    assert not is_off_target("xi đạp", "Xe đạp")
    assert not is_off_target(None, "Ngôi sao")  # no speech-to-text available: no verdict


if __name__ == "__main__":
    failed = 0
    for fn in CASES:
        try:
            fn()
            print(f"ok    {fn.__name__}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL  {fn.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    sys.exit(1 if failed else 0)
