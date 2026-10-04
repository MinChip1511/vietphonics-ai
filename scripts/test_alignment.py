"""Tests for backend/app/alignment.py (phoneme alignment).

Run from the repo root:  backend/venv/bin/python scripts/test_alignment.py
No test framework is configured in this repo, so this is a plain assert script.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.alignment import needleman_wunsch, map_alignment_to_elsa_format, compute_pronunciation_score  # noqa: E402

CASES = []


def case(fn):
    CASES.append(fn)
    return fn


def align(ref, hyp):
    return needleman_wunsch(ref.split(), hyp.split())


@case
def identical_sequences_are_all_matches():
    assert align("N O i _1 S a w _1", "N O i _1 S a w _1") == [(p, p) for p in "N O i _1 S a w _1".split()]


@case
def empty_inputs():
    assert align("", "") == []
    assert align("a _1", "") == [("a", None), ("_1", None)]
    assert align("", "a") == [(None, "a")]


@case
def near_consonant_substitution_is_one_substitution():
    # sao said as xao: S (retroflex) -> s (alveolar) is a single substitution, nothing else moves.
    assert align("S a w _1", "s a w _1") == [("S", "s"), ("a", "a"), ("w", "w"), ("_1", "_1")]


@case
def coda_aligns_with_coda_not_with_the_vowel():
    # ref "a w _1" vs heard "N _1": the heard consonant belongs to the coda w, and the vowel is the missing one.
    assert align("a w _1", "N _1") == [("a", None), ("w", "N"), ("_1", "_1")]


@case
def tone_is_never_substituted_by_a_non_tone():
    # A tone and a consonant are different kinds of sounds: report a missing tone + an extra sound.
    assert align("b a _2", "b a k") == [("b", "b"), ("a", "a"), ("_2", None), (None, "k")]


@case
def non_tone_is_never_substituted_by_a_tone():
    assert align("b a k", "b a _2") == [("b", "b"), ("a", "a"), ("k", None), (None, "_2")]


@case
def tone_confusion_stays_a_tone_substitution():
    assert align("m a _3", "m a _4") == [("m", "m"), ("a", "a"), ("_3", "_4")]


@case
def similar_vowel_beats_unrelated_vowel_when_choosing_what_to_pair():
    # ref has two vowels, heard has one. It is the near one (a ~ a_X) that must be paired.
    assert align("a O _1", "a_X _1") == [("a", "a_X"), ("O", None), ("_1", "_1")]


@case
def vowel_and_consonant_are_not_swapped_for_a_cheaper_gap_pair():
    # Unrelated sounds are two gaps (missing + extra), not one substitution.
    assert align("s a", "s k") == [("s", "s"), ("a", None), (None, "k")]


@case
def tone_mismatch_status_only_for_tone_pairs():
    pairs = align("b a _2", "b a k")
    rows, _ = map_alignment_to_elsa_format("ba", pairs)
    statuses = [r["status"] for r in rows]
    assert "TONE_MISMATCH" not in statuses, statuses
    assert statuses == ["CORRECT", "CORRECT", "DELETION", "INSERTION"], statuses


@case
def score_still_in_range_and_perfect_is_100():
    rows, _ = map_alignment_to_elsa_format("sao", align("S a w _1", "S a w _1"))
    assert compute_pronunciation_score(rows) == 100
    rows, _ = map_alignment_to_elsa_format("sao", align("S a w _1", ""))
    assert 0 <= compute_pronunciation_score(rows) <= 100  # no artificial floor


@case
def wrong_tone_never_reaches_the_good_band():
    # "đĩa xôi"-style report B10: one wrong tone among many correct phones scored 89 and "chính xác".
    ref = "d i a _3 s o i _1"
    rows, _ = map_alignment_to_elsa_format("đĩa xôi", align(ref, "d i a _1 s o i _1"))
    assert any(r["status"] == "TONE_MISMATCH" for r in rows)
    assert compute_pronunciation_score(rows) <= 74


@case
def any_phone_error_stays_below_the_good_band():
    rows, _ = map_alignment_to_elsa_format("sao", align("S a w _1", "s a w _1"))
    assert compute_pronunciation_score(rows) <= 79


@case
def hints_are_child_friendly_and_consistent():
    # M3/M4/M15: no IPA, no raw phone symbols, the same mistake always gives the same hint.
    rows_a, _ = map_alignment_to_elsa_format("xuân", align("s w 7_X N _1", "s 7_X N _1"))
    rows_b, _ = map_alignment_to_elsa_format("hoa", align("h w a _1", "h a _1"))
    missing = [r for r in rows_a + rows_b if r["status"] == "DELETION"]
    assert missing and all("u hoặc o" in r["mouth_tip"] for r in missing)
    for r in rows_a + rows_b:
        text = " ".join([r["canonical_name"], r["canonical_symbol"], r["mouth_tip"], r["elsa_feedback"]])
        assert not any(ch in text for ch in "ŋʂɕɗɓɛʈ↗↘ˀ˥˩"), text
        assert "ngạc" not in text and "/" not in text, text


@case
def alignment_is_deterministic():
    a = align("N O i _1 S a w _1", "O _1 s a _1")
    assert all(a == align("N O i _1 S a w _1", "O _1 s a _1") for _ in range(5))


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
