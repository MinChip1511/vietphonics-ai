"""Lessons and rewards: the content that the admin manages and children use (one source for both)."""
import json
import re
import uuid

from bson import Binary

from .config import VOCAB_PATH
from .database import clean, clean_all, col, now_iso
from .lessons_data import CATEGORIES

LESSON_STATUSES = ("draft", "published", "archived")
REWARD_KINDS = ("Mascot Outfit", "Visual Sticker", "Huy hiệu")
_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")


class CatalogError(ValueError):
    """Bad input for the catalog; the message is safe to show to the admin."""


# ---- lessons ------------------------------------------------------------------------------------

def _lesson_from_row(row):
    lesson = dict(row["data"])
    lesson["id"] = row["id"]
    # Every word needs a stable id (the admin edits words by id); seeded lessons were written without.
    for position, word in enumerate(lesson.get("words", []), start=1):
        word.setdefault("id", f"{row['id']}-w{position}")
    lesson["status"] = row["status"]
    lesson["updated_at"] = row["updated_at"]
    return lesson


def list_lessons(published_only=True, category=None):
    query = {"status": "published"} if published_only else {}
    rows = clean_all(col("lessons").find(query).sort([("sort_order", 1), ("_id", 1)]))
    lessons = [_lesson_from_row(r) for r in rows]
    if category and category != "all":
        lessons = [lesson for lesson in lessons if lesson.get("category") == category]
    return lessons


def get_lesson(lesson_id, published_only=True):
    row = clean(col("lessons").find_one({"_id": lesson_id}))
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
    if existing:
        col("lessons").update_one({"_id": new_id}, {"$set": {"status": status, "data": data, "updated_at": now_iso()}})
    else:
        last = col("lessons").find_one(sort=[("sort_order", -1)])
        col("lessons").insert_one({
            "_id": new_id, "status": status, "sort_order": (last["sort_order"] if last else 0) + 1,
            "data": data, "updated_at": now_iso(),
        })
    return get_lesson(new_id, published_only=False)


def delete_lesson(lesson_id):
    col("lessons").delete_one({"_id": lesson_id})


# ---- rewards ------------------------------------------------------------------------------------

def _reward_dict(row):
    d = dict(row)
    d["active"] = bool(d["active"])
    d["image"] = f"/api/uploads/{d['image']}" if d.get("image") else None
    return d


def list_rewards(active_only=True):
    query = {"active": True} if active_only else {}
    return [_reward_dict(r) for r in clean_all(col("rewards").find(query).sort([("sort_order", 1), ("created_at", 1)]))]


def get_reward(reward_id):
    row = clean(col("rewards").find_one({"_id": reward_id}))
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

    if existing:
        col("rewards").update_one({"_id": reward_id}, {"$set": {"title": title, "kind": kind, "cost": cost, "icon": icon, "active": active}})
        return get_reward(reward_id)
    new_id = f"rw-{uuid.uuid4().hex[:8]}"
    last = col("rewards").find_one(sort=[("sort_order", -1)])
    col("rewards").insert_one({
        "_id": new_id, "title": title, "kind": kind, "cost": cost, "icon": icon, "image": None, "active": active,
        "sort_order": (last["sort_order"] if last else 0) + 1, "created_at": now_iso(),
    })
    return get_reward(new_id)


# Reward images live in the database (collection "files"), so a deployment needs no persistent disk.
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_BYTES = 1_500_000
_MAGIC = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png"}


def _looks_like(content_type, data):
    """The bytes must really be the declared image type (a header alone proves nothing)."""
    if content_type == "image/webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return any(data.startswith(magic) and kind == content_type for magic, kind in _MAGIC.items())


def save_reward_image(reward_id, content_type, data: bytes):
    if content_type not in IMAGE_TYPES:
        raise CatalogError("Chỉ nhận ảnh JPG, PNG hoặc WebP.")
    if len(data) > MAX_IMAGE_BYTES:
        raise CatalogError("Ảnh tối đa 1.5MB.")
    if not _looks_like(content_type, data):
        raise CatalogError("Tệp không phải là ảnh hợp lệ.")
    reward = get_reward(reward_id)
    if not reward:
        raise CatalogError("Không tìm thấy phần thưởng.")
    file_id = f"rewards/{reward_id}-{uuid.uuid4().hex[:6]}{IMAGE_TYPES[content_type]}"
    col("files").insert_one({"_id": file_id, "content_type": content_type, "data": Binary(data), "created_at": now_iso()})
    previous = col("rewards").find_one_and_update({"_id": reward_id}, {"$set": {"image": file_id}})
    if previous and previous.get("image"):
        col("files").delete_one({"_id": previous["image"]})
    return get_reward(reward_id)


def get_file(file_id):
    """(content_type, bytes) of an uploaded file, or None."""
    doc = col("files").find_one({"_id": file_id})
    return (doc["content_type"], bytes(doc["data"])) if doc else None


def delete_reward(reward_id):
    """Removes a reward nobody owns; one that children already own is archived (hidden) instead."""
    if col("reward_redemptions").count_documents({"reward_id": reward_id}):
        col("rewards").update_one({"_id": reward_id}, {"$set": {"active": False}})
        return "archived"
    gone = col("rewards").find_one_and_delete({"_id": reward_id})
    if gone and gone.get("image"):
        col("files").delete_one({"_id": gone["image"]})
    return "deleted"
