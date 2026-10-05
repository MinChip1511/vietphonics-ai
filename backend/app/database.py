"""MongoDB access: the client, collections, indexes and small helpers shared by every data module.

Documents use the string `_id` as their identifier. `clean()` turns a stored document into the plain dict
the rest of the code works with (`_id` becomes `id`). Timestamps are ISO-8601 UTC strings
("2026-10-03T08:00:00.123456Z"), which sort correctly as text; only TTL fields are real datetimes.
"""
from datetime import datetime, timezone

from . import config

_client = None
_database = None
READY = False  # set by init_db() once the connection works and the schema/seed data exist


def utc_now() -> datetime:
    """Naive UTC datetime (what MongoDB stores and TTL indexes compare against)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def now_iso() -> str:
    return iso(utc_now())


def get_db():
    """The database handle (created on first use so importing the package never needs a server)."""
    global _client, _database
    if _database is None:
        uri = config.MONGODB_URI
        if uri.startswith("mongomock://"):
            if config.PRODUCTION:
                raise RuntimeError("mongomock:// is only for tests; set MONGODB_URI to a real MongoDB in production")
            import mongomock

            _client = mongomock.MongoClient()
        else:
            from pymongo import MongoClient

            _client = MongoClient(uri, serverSelectionTimeoutMS=15000, tz_aware=False)
        _database = _client[config.MONGODB_DB]
    return _database


def col(name: str):
    return get_db()[name]


def clean(document):
    """Stored document -> dict with `id` instead of `_id` (None stays None)."""
    if document is None:
        return None
    result = dict(document)
    result["id"] = result.pop("_id")
    return result


def clean_all(cursor):
    return [clean(d) for d in cursor]


def init_indexes():
    from pymongo import ASCENDING, DESCENDING

    col("accounts").create_index("email", unique=True)
    col("accounts").create_index("phone", unique=True)
    col("sessions").create_index("expires_at", expireAfterSeconds=0)  # expired sessions delete themselves
    col("sessions").create_index("account_id")
    col("children").create_index("parent_id")
    col("practice_history").create_index([("child_id", ASCENDING), ("created_at", DESCENDING)])
    col("reward_redemptions").create_index([("child_id", ASCENDING), ("reward_id", ASCENDING)], unique=True)
    col("analysis_attempts").create_index("created_at")
    col("orders").create_index("account_id")
    col("lessons").create_index([("sort_order", ASCENDING)])


def init_db():
    """Create indexes, then seed reference data and (outside production) demo accounts."""
    global READY
    init_indexes()
    from .seed import seed_all  # imported here: seed builds on the modules that use this one

    seed_all()
    READY = True
