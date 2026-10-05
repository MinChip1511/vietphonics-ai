"""Children: ownership, profile statistics derived from real practice history, practice records and rewards.

Nothing here is a stored guess: streak, accuracy, completed lessons, strengths and weaknesses are all
computed from `practice_history` (see build_profile), so every screen shows the same numbers.
"""
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from .catalog import list_lessons
from .database import clean, clean_all, col, iso, now_iso, utc_now
from .validation import ValidationError, clean_name

PASS_SCORE = 70            # a word counts as learned from this score on
STARS_PER_PASS = 15        # points ("sao") awarded for a passing attempt
MIN_AGE, MAX_AGE = 4, 7
RECENT_ATTEMPTS = 20       # accuracy = mean of the latest scored attempts
MIN_SAMPLES = 3            # a sound group needs this many phones before it is called strong/weak
VN_OFFSET = timedelta(hours=7)

DEFAULT_SETTINGS = {
    "region": "north",
    "sensitivity": 50,
    "consentAnalysis": True,
    "consentTraining": False,
    "retention": "30",
}
SETTING_VALIDATORS = {
    "region": lambda v: v in ("north", "south", "mixed"),
    "sensitivity": lambda v: isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 100,
    "consentAnalysis": lambda v: isinstance(v, bool),
    "consentTraining": lambda v: isinstance(v, bool),
    "retention": lambda v: v in ("1", "30", "90", "course"),
}


class KidError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


# ---- sound groups (labels the parent screens know) ----------------------------------------------

_TONES_HOI_NGA = {"_3", "_4"}


def sound_group(token, category):
    """Label of the sound family a phone belongs to."""
    if token in ("s", "S"):
        return "Âm S - X"
    if token in ("ts_", "tS"):
        return "Âm TR - CH"
    if token in _TONES_HOI_NGA:
        return "Thanh Hỏi - Ngã"
    if category == "tone":
        return "Thanh điệu"
    if category == "final":
        return "Âm cuối N - NG"
    if category == "initial" and token in ("l", "n"):
        return "Âm L - N"
    if category == "initial":
        return "Âm đầu cơ bản"
    return "Nguyên âm"


# ---- time helpers --------------------------------------------------------------------------------

def _parse(ts):
    if isinstance(ts, datetime):
        return ts
    text = str(ts).replace("T", " ").replace("Z", "")
    return datetime.strptime(text[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _vn_date(ts):
    return (_parse(ts) + VN_OFFSET).date()


def _today():
    return (datetime.now(timezone.utc) + VN_OFFSET).date()


def _streak(dates):
    days = set(dates)
    day = _today()
    if day not in days:
        day -= timedelta(days=1)
    streak = 0
    while day in days:
        streak += 1
        day -= timedelta(days=1)
    return streak


def _weekly(rows):
    """Average score per week (Monday-based) for the latest five weeks that have attempts."""
    weeks = defaultdict(list)
    for row in rows:
        day = _vn_date(row["created_at"])
        weeks[day - timedelta(days=day.weekday())].append(row["score"])
    return [round(sum(v) / len(v)) for _, v in sorted(weeks.items())[-5:]]


# ---- profile --------------------------------------------------------------------------------------

def _settings(row):
    stored = row.get("settings") or {}
    return {**DEFAULT_SETTINGS, **{k: v for k, v in stored.items() if k in DEFAULT_SETTINGS}}


def lesson_progress(history_rows, lessons):
    """{lesson_id: {passed, total, completed, best}} from a child's history and the published lessons."""
    best_by_word = defaultdict(int)
    for row in history_rows:
        if row.get("lesson_id"):
            key = (row["lesson_id"], row["word"].strip().lower())
            best_by_word[key] = max(best_by_word[key], row["score"])
    progress = {}
    for lesson in lessons:
        words = [w["word"].strip().lower() for w in lesson.get("words", [])]
        scores = [best_by_word.get((lesson["id"], w), 0) for w in words]
        passed = sum(1 for s in scores if s >= PASS_SCORE)
        progress[lesson["id"]] = {
            "passed": passed,
            "total": len(words),
            "completed": bool(words) and passed == len(words),
            "best": max(scores) if any(scores) else 0,
        }
    return progress


def build_profile(row):
    history = list(col("practice_history").find(
        {"child_id": row["id"]}, {"lesson_id": 1, "word": 1, "score": 1, "phones": 1, "created_at": 1}
    ).sort([("created_at", 1), ("_id", 1)]))
    lessons = list_lessons(published_only=True)
    progress = lesson_progress(history, lessons)

    recent = [h["score"] for h in history][-RECENT_ATTEMPTS:]
    groups = defaultdict(lambda: [0, 0])  # label -> [correct, total]
    by_category = defaultdict(lambda: [0, 0])  # initial / final / tone -> [correct, total]
    for h in history:
        for token, category, ok in h.get("phones", []):
            for bucket in (groups[sound_group(token, category)], by_category[category]):
                bucket[1] += 1
                bucket[0] += 1 if ok else 0
    rated = sorted(((c / t, label) for label, (c, t) in groups.items() if t >= MIN_SAMPLES), key=lambda x: x[0])
    needs = [label for accuracy, label in rated if accuracy < 0.75][:3]
    strong = [label for accuracy, label in reversed(rated) if accuracy >= 0.85][:2]
    if not history:  # no practice yet: use what the onboarding quiz found
        needs = list(row.get("initial_needs") or [])

    return {
        "id": row["id"],
        "parent_id": row.get("parent_id"),
        "name": row["name"],
        "age": row["age"],
        "avatar": row["avatar"],
        "stars": row["stars"],
        "streak": _streak(_vn_date(h["created_at"]) for h in history),
        "overall_accuracy": round(sum(recent) / len(recent)) if recent else 0,
        "completed_lessons": sum(1 for p in progress.values() if p["completed"]),
        "practice_count": len(history),
        "strong_sounds": strong,
        "needs_practice": needs,
        "weekly_progress": _weekly(history),
        # % of phones read correctly per kind of sound; None until enough phones were heard.
        "category_accuracy": {
            key: round(100 * by_category[key][0] / by_category[key][1]) if by_category[key][1] >= MIN_SAMPLES else None
            for key in ("initial", "final", "tone")
        },
        "progress": progress,
        "settings": _settings(row),
        "created_at": row["created_at"],
    }


# ---- access -----------------------------------------------------------------------------------------

def _row(child_id):
    return clean(col("children").find_one({"_id": child_id}))


def get_owned_child(child_id, account):
    """The child's row when `account` owns it; 404 otherwise (so another family's ids are not even confirmed)."""
    row = _row(child_id)
    if not row or row.get("parent_id") != account["id"]:
        raise KidError("Không tìm thấy hồ sơ bé", 404)
    return row


def list_children(account_id):
    return [build_profile(r) for r in clean_all(col("children").find({"parent_id": account_id}).sort("created_at", 1))]


def all_children():
    return [build_profile(r) for r in clean_all(col("children").find().sort("created_at", 1))]


def get_profile(child_id, account):
    return build_profile(get_owned_child(child_id, account))


def _check_age(age):
    if isinstance(age, bool) or not isinstance(age, int) or not MIN_AGE <= age <= MAX_AGE:
        raise ValidationError(f"VietPhonics dành cho bé từ {MIN_AGE} đến {MAX_AGE} tuổi.")
    return age


def _checked_settings(patch, base):
    settings = dict(base)
    for key, value in (patch or {}).items():
        if key not in SETTING_VALIDATORS or not SETTING_VALIDATORS[key](value):
            raise ValidationError("Cài đặt không hợp lệ.")
        settings[key] = value
    return settings


def create_child(account, *, name, age, avatar, initial_needs=None, settings=None, child_id=None, stars=0):
    name = clean_name(name, "tên của bé")
    age = _check_age(age)
    settings = _checked_settings(settings, DEFAULT_SETTINGS)
    child_id = child_id or f"child-{uuid.uuid4().hex[:10]}"
    col("children").insert_one({
        "_id": child_id, "name": name, "age": age, "avatar": str(avatar or "mascot:ca-voi")[:40],
        "stars": stars, "parent_id": account["id"], "initial_needs": list(initial_needs or [])[:3],
        "settings": settings, "created_at": now_iso(),
    })
    return build_profile(_row(child_id))


def update_child(child_id, account, patch):
    row = get_owned_child(child_id, account)
    changes = {}
    if "name" in patch:
        changes["name"] = clean_name(patch["name"], "tên của bé")
    if "age" in patch:
        changes["age"] = _check_age(patch["age"])
    if "avatar" in patch:
        changes["avatar"] = str(patch["avatar"])[:40]
    if patch.get("settings") is not None:
        changes["settings"] = _checked_settings(patch["settings"], _settings(row))
    if changes:
        col("children").update_one({"_id": child_id}, {"$set": changes})
    return build_profile(_row(child_id))


def delete_child(child_id):
    """Removes the profile and everything recorded for it (history, owned rewards)."""
    col("reward_redemptions").delete_many({"child_id": child_id})
    col("practice_history").delete_many({"child_id": child_id})
    col("children").delete_one({"_id": child_id})


# ---- practice -------------------------------------------------------------------------------------------

def record_attempt(analysis, account_id):
    """Stores the server-side result of an analysis so the score can be recorded without trusting the client."""
    attempt_id = f"att-{uuid.uuid4().hex[:16]}"
    phones = [
        [r.get("canonical_token"), r.get("category"), bool(r.get("is_correct"))]
        for r in analysis.get("elsa_rows", []) if r.get("canonical_token")
    ]
    errors = [
        {k: r.get(k) for k in ("canonical_name", "canonical_token", "observed_token", "status", "category")}
        for r in analysis.get("errors", [])
    ]
    col("analysis_attempts").insert_one({
        "_id": attempt_id, "account_id": account_id, "word": analysis.get("target_word", ""),
        "canonical": " ".join(analysis.get("canonical", [])), "score": int(analysis.get("score", 0)),
        "phones": phones, "errors": errors, "consumed": False, "created_at": now_iso(),
    })
    col("analysis_attempts").delete_many({"created_at": {"$lt": iso(utc_now() - timedelta(days=2))}})
    return attempt_id


def record_practice(account, child_id, attempt_id, lesson_id):
    """Saves a scored attempt for the child (once) and awards points when it reached the pass mark."""
    get_owned_child(child_id, account)  # 404 unless the child belongs to this account
    attempt = col("analysis_attempts").find_one({"_id": attempt_id, "account_id": account["id"]})
    if not attempt:
        raise KidError("Không tìm thấy kết quả chấm điểm này", 404)
    # The atomic flip decides who records it when two requests carry the same attempt.
    claimed = col("analysis_attempts").find_one_and_update(
        {"_id": attempt_id, "consumed": False}, {"$set": {"consumed": True}}, return_document=ReturnDocument.AFTER
    )
    if not claimed:
        raise KidError("Kết quả này đã được lưu rồi", 409)
    score = claimed["score"]
    passed = score >= PASS_SCORE
    col("practice_history").insert_one({
        "child_id": child_id, "word": claimed["word"], "canonical": claimed["canonical"], "score": score,
        "is_correct": passed, "errors": claimed["errors"], "lesson_id": lesson_id,
        "phones": claimed["phones"], "created_at": now_iso(),
    })
    awarded = STARS_PER_PASS if passed else 0
    if awarded:
        col("children").update_one({"_id": child_id}, {"$inc": {"stars": awarded}})
    return build_profile(_row(child_id)), awarded


def practice_history(child_id, account, limit=15):
    get_owned_child(child_id, account)
    cursor = col("practice_history").find({"child_id": child_id}).sort([("created_at", -1), ("_id", -1)]).limit(max(1, min(int(limit), 500)))
    return [
        {"id": str(h["_id"]), "child_id": h["child_id"], "word": h["word"], "canonical": h["canonical"],
         "score": h["score"], "is_correct": 1 if h["is_correct"] else 0, "errors": h.get("errors", []),
         "lesson_id": h.get("lesson_id"), "created_at": h["created_at"]}
        for h in cursor
    ]


# ---- rewards of a child -----------------------------------------------------------------------------------

def child_rewards(child_id, account):
    """Reward catalogue as this child sees it: balance, owned ids and (family) leaderboard."""
    from .catalog import get_reward, list_rewards

    row = get_owned_child(child_id, account)
    owned = [r["reward_id"] for r in col("reward_redemptions").find({"child_id": child_id})]
    catalogue = {r["id"]: r for r in list_rewards(active_only=True)}
    for reward_id in owned:  # an archived reward stays visible to the children who already own it
        if reward_id not in catalogue and get_reward(reward_id):
            catalogue[reward_id] = get_reward(reward_id)
    board = sorted(list_children(account["id"]), key=lambda c: -c["stars"])
    return {
        "balance": row["stars"],
        "owned": owned,
        "rewards": list(catalogue.values()),
        "leaderboard": [
            {"id": c["id"], "rank": i + 1, "name": c["name"], "points": c["stars"], "isCurrent": c["id"] == child_id}
            for i, c in enumerate(board)
        ],
    }


def redeem_reward(child_id, account, reward_id):
    from .catalog import get_reward

    get_owned_child(child_id, account)
    reward = get_reward(reward_id)
    if not reward or not reward["active"]:
        raise KidError("Phần thưởng này hiện không còn", 404)
    # The unique (child, reward) index stops a second redemption; the conditional decrement stops overspending.
    try:
        col("reward_redemptions").insert_one({"child_id": child_id, "reward_id": reward_id, "cost": reward["cost"], "created_at": now_iso()})
    except DuplicateKeyError:
        raise KidError("Con đã có phần thưởng này rồi", 409)
    spent = col("children").find_one_and_update(
        {"_id": child_id, "stars": {"$gte": reward["cost"]}}, {"$inc": {"stars": -reward["cost"]}}
    )
    if not spent:
        col("reward_redemptions").delete_one({"child_id": child_id, "reward_id": reward_id})
        raise KidError("Con chưa đủ điểm để đổi phần thưởng này", 400)
    return child_rewards(child_id, account)
