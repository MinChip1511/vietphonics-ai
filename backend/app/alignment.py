import numpy as np

from .phone_hints import hint, is_tone as is_tone_token, is_nucleus, is_final_only

# ---------------------------------------------------------------------------
# Phoneme-similarity costs for the alignment (integers, tenths of an "error").
# A gap (missing or extra phone) costs GAP_COST. Pairing two different phones costs
# less than a gap when they sound alike, and more than two gaps when they are unrelated,
# so unrelated sounds are reported as "missing + extra" instead of a fake substitution.
# ---------------------------------------------------------------------------
GAP_COST = 10
NEAR_COST = 4         # commonly confused / acoustically close pair (e.g. S ~ s, a ~ a_X, _3 ~ _4)
SAME_CLASS_COST = 8   # same kind of sound (consonant/consonant, vowel/vowel, tone/tone)
GLIDE_COST = 6        # vowel <-> its glide (i ~ j, u ~ w, o ~ w)
CROSS_CLASS_COST = 25  # tone vs non-tone, vowel vs consonant: more than a missing + an extra phone

_VOWELS = {"a", "a_X", "e", "E", "E_X", "i", "o", "O", "O_X", "u", "7", "7_X", "M", "M7", "ie", "uo"}

_NEAR_GROUPS = [
    # consonants (initial or final)
    {"S", "s"}, {"tS", "ts_"}, {"t", "t_h"}, {"d", "z"}, {"z", "dZ", "r"}, {"n", "l"}, {"n", "N"},
    {"N", "Nm"}, {"k", "kp"}, {"p", "b"}, {"b", "v"}, {"f", "v"}, {"G", "x"}, {"k", "x"}, {"m", "p"},
    # vowels: short/long, open/close pairs and diphthongs with their first element
    {"a", "a_X"}, {"E", "E_X"}, {"O", "O_X"}, {"7", "7_X"}, {"e", "E"}, {"o", "O"}, {"i", "ie"},
    {"ie", "e"}, {"u", "uo"}, {"uo", "o"}, {"M", "M7"}, {"M", "u"},
    # tones that children (and models) mix up most
    {"_5a", "_5b"}, {"_6a", "_6b"}, {"_3", "_4"},
]
_NEAR_PAIRS = {frozenset(pair) for group in _NEAR_GROUPS for pair in
               ((a, b) for a in group for b in group if a < b)}
_GLIDE_PAIRS = {frozenset(p) for p in (("i", "j"), ("u", "w"), ("o", "w"), ("O", "w"))}


def _phone_class(phone):
    if phone.startswith("_"):
        return "tone"
    return "vowel" if phone in _VOWELS else "consonant"


def substitution_cost(a, b):
    """Cost (in tenths) of aligning reference phone `a` with heard phone `b`."""
    if a == b:
        return 0
    pair = frozenset((a, b))
    if pair in _NEAR_PAIRS:
        return NEAR_COST
    if pair in _GLIDE_PAIRS:
        return GLIDE_COST
    if _phone_class(a) == _phone_class(b):
        return SAME_CLASS_COST
    return CROSS_CLASS_COST


def needleman_wunsch(ref, hyp):
    """
    Global alignment between the reference (canonical) phones and the hypothesis (predicted)
    phones, with phone-similarity substitution costs (see substitution_cost) and a flat gap cost.
    Returns a list of (ref_phone | None, hyp_phone | None) pairs.
    Ties are broken deterministically: substitution, then extra phone, then missing phone, so a
    missing phone is reported before an extra one when they sit at the same place.
    """
    n, m = len(ref), len(hyp)
    dp = np.zeros((n + 1, m + 1), dtype=np.int32)
    bt = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 = pair, 1 = missing (ref only), 2 = extra (hyp only)

    for i in range(1, n + 1):
        dp[i, 0] = i * GAP_COST
        bt[i, 0] = 1
    for j in range(1, m + 1):
        dp[0, j] = j * GAP_COST
        bt[0, j] = 2

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost_pair = dp[i - 1, j - 1] + substitution_cost(ref[i - 1], hyp[j - 1])
            cost_missing = dp[i - 1, j] + GAP_COST
            cost_extra = dp[i, j - 1] + GAP_COST
            best = min(cost_pair, cost_missing, cost_extra)
            dp[i, j] = best
            if cost_pair == best:
                bt[i, j] = 0
            elif cost_extra == best:
                bt[i, j] = 2
            else:
                bt[i, j] = 1

    pairs = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and bt[i, j] == 0:
            pairs.append((ref[i - 1], hyp[j - 1]))
            i -= 1
            j -= 1
        elif i > 0 and (j == 0 or bt[i, j] == 1):
            pairs.append((ref[i - 1], None))
            i -= 1
        else:
            pairs.append((None, hyp[j - 1]))
            j -= 1

    return pairs[::-1]


def _phone_category(token, seen_nucleus):
    if token is None:
        return "general"
    if is_tone_token(token):
        return "tone"
    if is_nucleus(token):
        return "nucleus"
    return "final" if (seen_nucleus or is_final_only(token)) else "initial"


def map_alignment_to_elsa_format(target_word, pairs):
    """
    Constructs the 2-column ELSA Speak format:
    Left: Canonical IPA with audio sample
    Right: What you said ("BẠN NÓI") with "Tuyệt vời!" or observed sound + mouth guidance
    Also maps letter-level colors for the target word text!
    """
    elsa_rows = []

    seen_nucleus = False  # a consonant before the vowel is an onset, after it a coda
    for r, h in pairs:
        if r is None and h is None:
            continue

        category = _phone_category(r, seen_nucleus)
        if is_tone_token(r):
            seen_nucleus = False
        elif is_nucleus(r):
            seen_nucleus = True
        ref_info = {"category": category}
        ref, obs = hint(r), hint(h)
        is_tone = is_tone_token(r) or is_tone_token(h)
        is_correct = (r == h)

        if is_correct:
            status = "CORRECT"
            elsa_feedback = "Tuyệt vời!"
            tip = ""
        elif r is None:
            status = "INSERTION"
            elsa_feedback = f"Con đọc thừa {obs['name']}"
            tip = f"Con đọc thừa {obs['name']}. Hãy đọc gọn hơn nhé."
        elif h is None:
            status = "DELETION"
            elsa_feedback = f"Chưa nghe thấy {ref['name']}"
            tip = f"Con chưa đọc {ref['name']} (như trong “{ref['example']}”). {ref['tip']}"
        elif is_tone:
            status = "TONE_MISMATCH"
            elsa_feedback = f"Con đọc {obs['name']}, từ này cần {ref['name']}"
            tip = f"Từ này mang {ref['name']}, con đang đọc {obs['name']}. {ref['tip']}"
        else:
            status = "SUBSTITUTION"
            elsa_feedback = f"Con đọc {obs['name']}, từ này cần {ref['name']}"
            tip = f"Con đọc {obs['name']} rồi. Từ này cần {ref['name']} (như trong “{ref['example']}”). {ref['tip']}"

        row = {
            "canonical_symbol": ref["symbol"],
            "canonical_name": ref["name"],
            "canonical_token": r,
            "observed_symbol": obs["symbol"] if h else "∅",
            "observed_name": obs["name"] if h else "bỏ sót",
            "observed_token": h,
            "status": status,
            "is_correct": is_correct,
            "is_tone": is_tone,
            "elsa_feedback": elsa_feedback,
            "mouth_tip": tip,
            "category": ref_info.get("category", "general")
        }
        elsa_rows.append(row)

    # Compute letter-level coloring for the target word text
    # e.g. "sáng": { "s": "red", "á": "green", "ng": "green" }
    letter_highlights = generate_letter_highlights(target_word, elsa_rows)

    return elsa_rows, letter_highlights


def parse_vietnamese_syllable(syl):
    """
    Splits a single Vietnamese syllable into (onset, nucleus, coda).
    Case-preserving, handles uppercase/capitalized letters.
    """
    syl_lower = syl.lower()

    # Digraphs and monographs for initial consonant (ordered longest to shortest)
    ONSET_LIST = [
        "ngh", "ng", "nh", "th", "ph", "ch", "tr", "kh", "gi", "gh", "qu",
        "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x"
    ]
    # Codas ordered longest to shortest
    CODA_LIST = ["ng", "nh", "ch", "m", "p", "t", "c", "n"]

    matched_onset = ""
    for o in ONSET_LIST:
        if syl_lower.startswith(o):
            matched_onset = syl[:len(o)]
            break

    rem = syl[len(matched_onset):]
    rem_lower = rem.lower()

    matched_coda = ""
    for c in CODA_LIST:
        # Make sure rem has a vowel before the coda
        if rem_lower.endswith(c) and len(rem) > len(c):
            matched_coda = rem[-len(c):]
            rem = rem[:-len(c)]
            break

    matched_nucleus = rem
    return matched_onset, matched_nucleus, matched_coda


def generate_letter_highlights(word, elsa_rows):
    """
    Decomposes the word into syllables / letter clusters and assigns color status:
    'green' (correct), 'amber' (near/tone), 'red' (error)
    Highlights precisely only the mispronounced letters/phonemes.
    """
    if not word:
        return []

    errors = [r for r in elsa_rows if not r.get("is_correct", False)]
    if not errors:
        # 100% correct: entire word is vibrant green
        return [{"text": word, "color": "green", "status": "CORRECT"}]

    word_tokens = word.strip().split()
    if not word_tokens:
        return [{"text": word, "color": "green", "status": "CORRECT"}]

    # Partition elsa_rows into syllable buckets by tone token
    syllable_buckets = []
    current_bucket = []
    for r in elsa_rows:
        current_bucket.append(r)
        if r.get("is_tone") or str(r.get("canonical_token", "")).startswith("_"):
            syllable_buckets.append(current_bucket)
            current_bucket = []
    if current_bucket:
        syllable_buckets.append(current_bucket)

    # Reconcile bucket count with word token count
    if len(word_tokens) == 1 and len(syllable_buckets) > 1:
        syllable_buckets = [elsa_rows]
    elif len(syllable_buckets) != len(word_tokens):
        if len(syllable_buckets) < len(word_tokens):
            while len(syllable_buckets) < len(word_tokens):
                syllable_buckets.append([])

    final_segments = []

    for w_idx, syl_text in enumerate(word_tokens):
        is_last_word = (w_idx == len(word_tokens) - 1)
        suffix = "" if is_last_word else " "

        bucket = syllable_buckets[w_idx] if w_idx < len(syllable_buckets) else []
        onset_text, nucleus_text, coda_text = parse_vietnamese_syllable(syl_text)

        syl_errors = [r for r in bucket if not r.get("is_correct", False)]
        hard_errors = [r for r in syl_errors if r.get("status") != "UNSURE"]
        unsure_rows = [r for r in syl_errors if r.get("status") == "UNSURE"]

        if not syl_errors:
            # Whole syllable is 100% correct
            final_segments.append({
                "text": syl_text + suffix,
                "color": "green",
                "status": "CORRECT"
            })
            continue

        # Extract specific phoneme error categories in this syllable
        initial_error = any(r.get("category") == "initial" for r in hard_errors)
        coda_error = any(r.get("category") == "final" for r in hard_errors)
        tone_error = any(r.get("is_tone") for r in hard_errors)
        nucleus_error = any(r.get("category") == "nucleus" for r in hard_errors)
        initial_unsure = any(r.get("category") == "initial" for r in unsure_rows)
        coda_unsure = any(r.get("category") == "final" for r in unsure_rows)
        nucleus_unsure = any(r.get("is_tone") or r.get("category") == "nucleus" for r in unsure_rows)

        # Onset segment
        if onset_text:
            onset_color = "red" if initial_error else ("amber" if initial_unsure else "green")
            onset_status = "SUBSTITUTION" if initial_error else ("UNSURE" if initial_unsure else "CORRECT")
            final_segments.append({
                "text": onset_text,
                "color": onset_color,
                "status": onset_status
            })

        # Nucleus segment
        if nucleus_text:
            if nucleus_error:
                nuc_color = "red"
                nuc_status = "VOWEL_ERROR"
            elif tone_error:
                nuc_color = "amber"
                nuc_status = "TONE_MISMATCH"
            elif nucleus_unsure:
                nuc_color = "amber"
                nuc_status = "UNSURE"
            else:
                nuc_color = "green"
                nuc_status = "CORRECT"
            final_segments.append({
                "text": nucleus_text,
                "color": nuc_color,
                "status": nuc_status
            })

        # Coda segment
        if coda_text:
            coda_color = "red" if coda_error else ("amber" if coda_unsure else "green")
            coda_status = "FINAL_ERROR" if coda_error else ("UNSURE" if coda_unsure else "CORRECT")
            final_segments.append({
                "text": coda_text + suffix,
                "color": coda_color,
                "status": coda_status
            })
        elif suffix:
            # If no coda, attach trailing space to last segment of this word
            if final_segments:
                final_segments[-1]["text"] += suffix

    # Merge adjacent segments with identical color to avoid fragmented spans
    merged = []
    for seg in final_segments:
        if not seg["text"]:
            continue
        if merged and merged[-1]["color"] == seg["color"]:
            merged[-1]["text"] += seg["text"]
            if seg["status"] != "CORRECT":
                merged[-1]["status"] = seg["status"]
        else:
            merged.append(dict(seg))

    return merged if merged else [{"text": word, "color": "amber", "status": "NEAR"}]


# A word with a clear mistake must never reach the "good" band (85+): the headline, the colours
# and the per-phone detail would contradict each other.
SCORE_CAP_TONE_ERROR = 74
SCORE_CAP_PHONE_ERROR = 79
SCORE_CAP_UNSURE = 84


def compute_pronunciation_score(elsa_rows):
    if not elsa_rows:
        return 0
    total_w = 0.0
    earned_w = 0.0
    for r in elsa_rows:
        w = 1.5 if r["is_tone"] else 1.0
        total_w += w
        if r["is_correct"]:
            earned_w += w
        elif r["status"] == "TONE_MISMATCH":
            earned_w += w * 0.4
        elif r["status"] == "SUBSTITUTION":
            earned_w += w * 0.3
        elif r["status"] == "UNSURE":
            earned_w += w * 0.6
    score = int(round(earned_w / max(total_w, 1e-6) * 100))

    statuses = {r["status"] for r in elsa_rows if not r["is_correct"]}
    if "TONE_MISMATCH" in statuses:
        score = min(score, SCORE_CAP_TONE_ERROR)
    elif statuses - {"UNSURE"}:
        score = min(score, SCORE_CAP_PHONE_ERROR)
    elif statuses:
        score = min(score, SCORE_CAP_UNSURE)
    return max(0, min(100, score))


def generate_feedback_summary(score, elsa_rows, target_word=""):
    errors = [r for r in elsa_rows if not r["is_correct"]]
    if score >= 85 and not errors:
        headline = "Tuyệt vời!"
        badge = "Xuất sắc ⭐⭐⭐"
        encouragement = "Con đọc rất chuẩn cả âm và dấu thanh!"
    elif score >= 75:
        headline = "Khá tốt!"
        badge = "Rất tốt ⭐⭐"
        encouragement = "Con đọc nghe rõ rồi, chỉ cần sửa nhẹ chỗ màu cam hoặc đỏ nhé!"
    elif score >= 55:
        headline = "Gần đúng rồi!"
        badge = "Cố lên ⭐"
        encouragement = "Con bấm loa nghe lại những chỗ màu đỏ rồi thử lại nhé!"
    else:
        headline = "Cần luyện thêm!"
        badge = "Thử lại nhé"
        encouragement = "Không sao cả! Con xem gợi ý bên dưới rồi mình đọc lại cùng Cá Xanh nhé."

    # Mistakes first (they matter more than doubtful phones), one hint per distinct phone.
    ordered = sorted(errors, key=lambda e: e["status"] == "UNSURE")
    tips, seen = [], set()
    for e in ordered:
        key = (e.get("canonical_token"), e["status"])
        if e["mouth_tip"] and key not in seen:
            seen.add(key)
            tips.append(f"• {e['mouth_tip']}")
        if len(tips) == 2:
            break

    return {
        "headline": headline,
        "badge": badge,
        "encouragement": encouragement,
        "tips": tips if tips else ["• Con đọc tròn vành rõ chữ, nhịp điệu tự nhiên!"]
    }
