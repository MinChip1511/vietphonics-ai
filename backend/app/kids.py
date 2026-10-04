"""Children: ownership, profile statistics derived from real practice history, practice records and rewards.

Nothing here is a stored guess: streak, accuracy, completed lessons, strengths and weaknesses are all
computed from `practice_history` (see build_profile), so every screen shows the same numbers.
"""
import json
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from .catalog import list_lessons
from .database import db
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
    try:
        stored = json.loads(row["settings_json"] or "{}")
    except ValueError:
        stored = {}
    return {**DEFAULT_SETTINGS, **{k: v for k, v in stored.items() if k in DEFAULT_SETTINGS}}


def lesson_progress(history_rows, lessons):
    """{lesson_id: {passed, total, completed, best}} from a child's history and the published lessons."""
    best_by_word = defaultdict(int)
    for row in history_rows:
        if row["lesson_id"]:
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
    with db() as conn:
        history = conn.execute(
            "SELECT lesson_id, word, score, phones_json, created_at FROM practice_history WHERE child_id = ? ORDER BY created_at, id",
            (row["id"],),
        ).fetchall()
    lessons = list_lessons(published_only=True)
    progress = lesson_progress(history, lessons)

    recent = [h["score"] for h in history][-RECENT_ATTEMPTS:]
    groups = defaultdict(lambda: [0, 0])  # label -> [correct, total]
    by_category = defaultdict(lambda: [0, 0])  # initial / final / tone -> [correct, total]
    for h in history:
        for token, category, ok in json.loads(h["phones_json"] or "[]"):
            for bucket in (groups[sound_group(token, category)], by_category[category]):
                bucket[1] += 1
                bucket[0] += 1 if ok else 0
    rated = sorted(((c / t, label) for label, (c, t) in groups.items() if t >= MIN_SAMPLES), key=lambda x: x[0])
    needs = [label for accuracy, label in rated if accuracy < 0.75][:3]
    strong = [label for accuracy, label in reversed(rated) if accuracy >= 0.85][:2]
    if not history:  # no practice yet: use what the onboarding quiz found
        needs = json.loads(row["initial_needs"] or "[]")

    return {
        "id": row["id"],
        "parent_id": row["parent_id"],
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
    with db() as conn:
        return conn.execute("SELECT * FROM children WHERE id = ?", (child_id,)).fetchone()


def get_owned_child(child_id, account):
    """The child's row when `account` owns it; 404 otherwise (so another family's ids are not even confirmed)."""
    row = _row(child_id)
    if not row or row["parent_id"] != account["id"]:
        raise KidError("Không tìm thấy hồ sơ bé", 404)
    return row


def list_children(account_id):
    with db() as conn:
        rows = conn.execute("SELECT * FROM children WHERE parent_id = ? ORDER BY created_at, rowid", (account_id,)).fetchall()
    return [build_profile(r) for r in rows]


def all_children():
    with db() as conn:
        rows = conn.execute("SELECT * FROM children ORDER BY created_at, rowid").fetchall()
    return [build_profile(r) for r in rows]


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


def create_child(account, *, name, age, avatar, initial_needs=None, settings=None, child_id=None):
    name = clean_name(name, "tên của bé")
    age = _check_age(age)
    settings = _checked_settings(settings, DEFAULT_SETTINGS)
    avatar = str(avatar or "mascot:ca-voi")[:40]
    child_id = child_id or f"child-{uuid.uuid4().hex[:10]}"
    with db() as conn:
        conn.execute(
            "INSERT INTO children (id, name, age, avatar, stars, parent_id, initial_needs, settings_json) VALUES (?, ?, ?, ?, 0, ?, ?, ?)",
            (child_id, name, age, avatar, account["id"], json.dumps(list(initial_needs or [])[:3], ensure_ascii=False), json.dumps(settings)),
        )
    return build_profile(_row(child_id))


def update_child(child_id, account, patch):
    row = get_owned_child(child_id, account)
    name, age, avatar, settings = row["name"], row["age"], row["avatar"], _settings(row)
    if "name" in patch:
        name = clean_name(patch["name"], "tên của bé")
    if "age" in patch:
        age = _check_age(patch["age"])
    if "avatar" in patch:
        avatar = str(patch["avatar"])[:40]
    settings = _checked_settings(patch.get("settings"), settings)
    with db() as conn:
        conn.execute(
            "UPDATE children SET name = ?, age = ?, avatar = ?, settings_json = ? WHERE id = ?",
            (name, age, avatar, json.dumps(settings), child_id),
        )
    return build_profile(_row(child_id))


def delete_child(child_id):
    """Removes the profile and everything recorded for it (history, owned rewards)."""
    with db() as conn:
        conn.execute("DELETE FROM reward_redemptions WHERE child_id = ?", (child_id,))
        conn.execute("DELETE FROM practice_history WHERE child_id = ?", (child_id,))
        conn.execute("DELETE FROM children WHERE id = ?", (child_id,))


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
    with db() as conn:
        conn.execute(
            """INSERT INTO analysis_attempts (id, account_id, word, canonical, score, phones_json, errors_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (attempt_id, account_id, analysis.get("target_word", ""), " ".join(analysis.get("canonical", [])),
             int(analysis.get("score", 0)), json.dumps(phones), json.dumps(errors, ensure_ascii=False),
             datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")),
        )
        conn.execute(
            "DELETE FROM analysis_attempts WHERE created_at < ?",
            ((datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),),
        )
    return attempt_id


def record_practice(account, child_id, attempt_id, lesson_id):
    """Saves a scored attempt for the child (once) and awards points when it reached the pass mark."""
    get_owned_child(child_id, account)  # 404 unless the child belongs to this account
    with db() as conn:
        attempt = conn.execute(
            "SELECT * FROM analysis_attempts WHERE id = ? AND account_id = ?", (attempt_id, account["id"])
        ).fetchone()
        if not attempt:
            raise KidError("Không tìm thấy kết quả chấm điểm này", 404)
        if attempt["consumed"]:
            raise KidError("Kết quả này đã được lưu rồi", 409)
        score = attempt["score"]
        passed = score >= PASS_SCORE
        conn.execute("UPDATE analysis_attempts SET consumed = 1 WHERE id = ?", (attempt_id,))
        conn.execute(
            """INSERT INTO practice_history (child_id, word, canonical, score, is_correct, errors_json, lesson_id, phones_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (child_id, attempt["word"], attempt["canonical"], score, 1 if passed else 0,
             attempt["errors_json"], lesson_id, attempt["phones_json"]),
        )
        awarded = STARS_PER_PASS if passed else 0
        if awarded:
            conn.execute("UPDATE children SET stars = stars + ? WHERE id = ?", (awarded, child_id))
    return build_profile(_row(child_id)), awarded


def practice_history(child_id, account, limit=15):
    get_owned_child(child_id, account)
    with db() as conn:
        rows = conn.execute(
            """SELECT id, child_id, word, canonical, score, is_correct, errors_json, lesson_id, created_at
               FROM practice_history WHERE child_id = ? ORDER BY created_at DESC, id DESC LIMIT ?""",
            (child_id, max(1, min(int(limit), 500))),
        ).fetchall()
    history = []
    for r in rows:
        d = dict(r)
        d["errors"] = json.loads(d.pop("errors_json") or "[]")
        history.append(d)
    return history


# ---- rewards of a child -----------------------------------------------------------------------------------

def child_rewards(child_id, account):
    """Reward catalogue as this child sees it: balance, owned ids and (family) leaderboard."""
    from .catalog import list_rewards

    row = get_owned_child(child_id, account)
    with db() as conn:
        owned = [r["reward_id"] for r in conn.execute("SELECT reward_id FROM reward_redemptions WHERE child_id = ?", (child_id,))]
        owned_rows = conn.execute("SELECT * FROM rewards WHERE id IN (%s)" % ",".join("?" * len(owned)), owned).fetchall() if owned else []
    catalogue = {r["id"]: r for r in list_rewards(active_only=True)}
    for r in owned_rows:  # an archived reward stays visible to the children who already own it
        if r["id"] not in catalogue:
            from .catalog import get_reward

            catalogue[r["id"]] = get_reward(r["id"])
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
    conn = db_connect_immediate()
    try:
        owned = conn.execute("SELECT 1 FROM reward_redemptions WHERE child_id = ? AND reward_id = ?", (child_id, reward_id)).fetchone()
        if owned:
            raise KidError("Con đã có phần thưởng này rồi", 409)
        stars = conn.execute("SELECT stars FROM children WHERE id = ?", (child_id,)).fetchone()["stars"]
        if stars < reward["cost"]:
            raise KidError("Con chưa đủ điểm để đổi phần thưởng này", 400)
        conn.execute("UPDATE children SET stars = stars - ? WHERE id = ?", (reward["cost"], child_id))
        conn.execute(
            "INSERT INTO reward_redemptions (child_id, reward_id, cost, created_at) VALUES (?, ?, ?, ?)",
            (child_id, reward_id, reward["cost"], datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return child_rewards(child_id, account)


def db_connect_immediate():
    """Connection with a write lock taken up front, so two redemptions cannot both pass the balance check."""
    from .database import connect

    conn = connect()
    conn.execute("BEGIN IMMEDIATE")
    return conn
