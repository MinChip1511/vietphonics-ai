"""Lessons and rewards: the content that the admin manages and children use (one source for both)."""
import json
import re
import uuid
from datetime import datetime, timezone

from .database import db
from .lessons_data import CATEGORIES

from .config import UPLOAD_DIR, VOCAB_PATH
LESSON_STATUSES = ("draft", "published", "archived")
REWARD_KINDS = ("Mascot Outfit", "Visual Sticker", "Huy hiệu")
_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")


class CatalogError(ValueError):
    """Bad input for the catalog; the message is safe to show to the admin."""


def _now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---- lessons ------------------------------------------------------------------------------------

def _lesson_from_row(row):
    lesson = json.loads(row["data"])
    lesson["id"] = row["id"]
    # Every word needs a stable id (the admin edits words by id); seeded lessons were written without.
    for position, word in enumerate(lesson.get("words", []), start=1):
        word.setdefault("id", f"{row['id']}-w{position}")
    lesson["status"] = row["status"]
    lesson["updated_at"] = row["updated_at"]
    return lesson


def list_lessons(published_only=True, category=None):
    sql = "SELECT * FROM lessons"
    clauses, params = [], []
    if published_only:
        clauses.append("status = 'published'")
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY sort_order, id"
    with db() as conn:
        lessons = [_lesson_from_row(r) for r in conn.execute(sql, params)]
    if category and category != "all":
        lessons = [lesson for lesson in lessons if lesson.get("category") == category]
    return lessons


def get_lesson(lesson_id, published_only=True):
    with db() as conn:
        row = conn.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
    if not row or (published_only and row["status"] != "published"):
        return None
    return _lesson_from_row(row)


def categories():
    """Category list for the catalog filter, with a live count of the published lessons."""
    lessons = list_lessons(published_only=True)
    result = []
    for category in CATEGORIES:
        if category["id"] == "all":
            result.append({**category, "name": f"Tất cả bài học ({len(lessons)} bài)"})
        else:
            result.append(dict(category))
    return result


_phones_cache = None


def valid_phones():
    """Phone symbols the model knows (vocab.json), used to validate canonical strings typed by admins."""
    global _phones_cache
    if _phones_cache is None:
        try:
            _phones_cache = {p for p in json.loads(VOCAB_PATH.read_text())["phone2id"] if not p.startswith("<")}
        except (OSError, KeyError, ValueError):
            _phones_cache = set()  # vocabulary unavailable: skip the symbol check instead of blocking edits
    return _phones_cache


def _clean_word(word, index, known_phones):
    text = str(word.get("word") or "").strip()
    canonical = " ".join(str(word.get("canonical") or "").split())
    if not text:
        raise CatalogError(f"Từ số {index + 1}: vui lòng nhập từ tiếng Việt.")
    if len(text) > 60:
        raise CatalogError(f"Từ “{text}”: tối đa 60 ký tự.")
    if not canonical:
        raise CatalogError(f"Từ “{text}”: vui lòng nhập chuỗi âm vị chuẩn (ví dụ: b a _1).")
    if known_phones:
        unknown = [p for p in canonical.split() if p not in known_phones]
        if unknown:
            raise CatalogError(f"Từ “{text}”: âm vị không hợp lệ: {', '.join(unknown)}.")
    cleaned = {k: v for k, v in word.items() if k in {"id", "phoneme", "phonemeName", "illustration", "guide", "mouthTip", "note"}}
    cleaned.update({"word": text, "canonical": canonical})
    cleaned.setdefault("id", f"w-{uuid.uuid4().hex[:8]}")
    return cleaned


def save_lesson(payload, lesson_id=None, known_phones=None):
    """Create (lesson_id None) or update a lesson. `payload` carries the editable fields; anything the
    editor does not send (mouth guide, games, sentences...) is kept from the stored lesson."""
    existing = get_lesson(lesson_id, published_only=False) if lesson_id else None
    if lesson_id and not existing:
        raise CatalogError("Không tìm thấy bài học.")

    title = str(payload.get("title") or "").strip()
    if not title:
        raise CatalogError("Vui lòng nhập tiêu đề bài học.")
    category = payload.get("category") or (existing or {}).get("category")
    if category not in {c["id"] for c in CATEGORIES if c["id"] != "all"}:
        raise CatalogError("Vui lòng chọn nhóm bài học.")
    status = payload.get("status") or (existing or {}).get("status") or "draft"
    if status not in LESSON_STATUSES:
        raise CatalogError("Trạng thái bài học không hợp lệ.")
    words_in = payload["words"] if "words" in payload else (existing or {}).get("words", [])
    words = [_clean_word(w, i, known_phones) for i, w in enumerate(words_in)]
    if status == "published" and not words:
        raise CatalogError("Bài học cần có ít nhất một từ trước khi xuất bản.")

    data = dict(existing or {})
    for transient in ("status", "updated_at"):
        data.pop(transient, None)
    category_name = next((c["name"] for c in CATEGORIES if c["id"] == category), category)
    data.update({
        "title": title,
        "category": category,
        "categoryName": data.get("categoryName") or category_name.split(":")[0],
        "difficulty": payload.get("difficulty") or data.get("difficulty") or "Dễ",
        "description": payload.get("description", data.get("description", "")),
        "duration": data.get("duration") or f"{max(3, len(words))} phút",
        "icon": payload.get("icon") or data.get("icon") or "📘",
        "level": data.get("level", 1),
        "words": words,
    })

    new_id = lesson_id or f"lesson-{uuid.uuid4().hex[:8]}"
    data.pop("id", None)
    with db() as conn:
        if existing:
            conn.execute(
                "UPDATE lessons SET status = ?, data = ?, updated_at = ? WHERE id = ?",
                (status, json.dumps(data, ensure_ascii=False), _now(), new_id),
            )
        else:
            order = conn.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM lessons").fetchone()[0]
            conn.execute(
                "INSERT INTO lessons (id, status, sort_order, data, updated_at) VALUES (?, ?, ?, ?, ?)",
                (new_id, status, order, json.dumps(data, ensure_ascii=False), _now()),
            )
    return get_lesson(new_id, published_only=False)


def delete_lesson(lesson_id):
    with db() as conn:
        conn.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))


# ---- rewards ------------------------------------------------------------------------------------

def _reward_dict(row):
    d = dict(row)
    d["active"] = bool(d["active"])
    d["image"] = f"/api/uploads/{d['image']}" if d.get("image") else None
    return d


def list_rewards(active_only=True):
    sql = "SELECT * FROM rewards" + (" WHERE active = 1" if active_only else "") + " ORDER BY sort_order, created_at"
    with db() as conn:
        return [_reward_dict(r) for r in conn.execute(sql)]


def get_reward(reward_id):
    with db() as conn:
        row = conn.execute("SELECT * FROM rewards WHERE id = ?", (reward_id,)).fetchone()
    return _reward_dict(row) if row else None


def save_reward(payload, reward_id=None):
    existing = get_reward(reward_id) if reward_id else None
    if reward_id and not existing:
        raise CatalogError("Không tìm thấy phần thưởng.")
    title = str(payload.get("title", (existing or {}).get("title", ""))).strip()
    if not title or len(title) > 60:
        raise CatalogError("Tên phần thưởng cần từ 1 đến 60 ký tự.")
    kind = payload.get("kind", (existing or {}).get("kind", REWARD_KINDS[0]))
    if kind not in REWARD_KINDS:
        raise CatalogError("Loại phần thưởng không hợp lệ.")
    try:
        cost = int(payload.get("cost", (existing or {}).get("cost", 0)))
    except (TypeError, ValueError):
        raise CatalogError("Giá đổi phải là một số.")
    if not 1 <= cost <= 100000:
        raise CatalogError("Giá đổi phải lớn hơn 0.")
    active = bool(payload.get("active", (existing or {}).get("active", True)))
    icon = payload.get("icon", (existing or {}).get("icon")) or "🎁"

    with db() as conn:
        if existing:
            conn.execute(
                "UPDATE rewards SET title = ?, kind = ?, cost = ?, icon = ?, active = ? WHERE id = ?",
                (title, kind, cost, icon, 1 if active else 0, reward_id),
            )
            new_id = reward_id
        else:
            new_id = f"rw-{uuid.uuid4().hex[:8]}"
            order = conn.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM rewards").fetchone()[0]
            conn.execute(
                "INSERT INTO rewards (id, title, kind, cost, icon, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (new_id, title, kind, cost, icon, 1 if active else 0, order, _now()),
            )
    return get_reward(new_id)


IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_BYTES = 1_500_000


def save_reward_image(reward_id, content_type, data: bytes):
    if content_type not in IMAGE_TYPES:
        raise CatalogError("Chỉ nhận ảnh JPG, PNG hoặc WebP.")
    if len(data) > MAX_IMAGE_BYTES:
        raise CatalogError("Ảnh tối đa 1.5MB.")
    if not get_reward(reward_id):
        raise CatalogError("Không tìm thấy phần thưởng.")
    folder = UPLOAD_DIR / "rewards"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{reward_id}-{uuid.uuid4().hex[:6]}{IMAGE_TYPES[content_type]}"
    (folder / name).write_bytes(data)
    with db() as conn:
        conn.execute("UPDATE rewards SET image = ? WHERE id = ?", (f"rewards/{name}", reward_id))
    return get_reward(reward_id)


def delete_reward(reward_id):
    """Removes a reward nobody owns; one that children already own is archived (hidden) instead."""
    with db() as conn:
        owned = conn.execute("SELECT COUNT(*) FROM reward_redemptions WHERE reward_id = ?", (reward_id,)).fetchone()[0]
        if owned:
            conn.execute("UPDATE rewards SET active = 0 WHERE id = ?", (reward_id,))
            return "archived"
        conn.execute("DELETE FROM rewards WHERE id = ?", (reward_id,))
        return "deleted"
