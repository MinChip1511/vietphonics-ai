"""SQLite connection helper, schema and light migrations.

The database file defaults to backend/vietphonics.db; set VIETPHONICS_DB to use another one (tests do).
Every table is created with IF NOT EXISTS and columns added later go through `_add_column`, so an
existing database keeps its rows when the schema grows.
"""
import sqlite3
from contextlib import contextmanager

from .config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'parent',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    must_change_password INTEGER NOT NULL DEFAULT 0,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS otp_codes (
    phone TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    avatar TEXT NOT NULL,
    streak INTEGER DEFAULT 0,
    stars INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 0,
    overall_accuracy INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    total_practice_time TEXT DEFAULT '0 phút',
    strong_sounds TEXT DEFAULT '[]',
    needs_practice TEXT DEFAULT '[]',
    weekly_progress TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS practice_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id TEXT NOT NULL,
    word TEXT NOT NULL,
    canonical TEXT NOT NULL,
    score INTEGER NOT NULL,
    is_correct INTEGER NOT NULL,
    errors_json TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id)
);
CREATE TABLE IF NOT EXISTS analysis_attempts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    word TEXT NOT NULL,
    canonical TEXT NOT NULL,
    score INTEGER NOT NULL,
    phones_json TEXT NOT NULL DEFAULT '[]',
    errors_json TEXT NOT NULL DEFAULT '[]',
    consumed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'draft',
    sort_order INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    cost INTEGER NOT NULL,
    icon TEXT,
    image TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    reward_id TEXT NOT NULL,
    cost INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (child_id, reward_id)
);
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monthly INTEGER NOT NULL DEFAULT 0,
    yearly INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    perks_json TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    campaign TEXT NOT NULL,
    type TEXT NOT NULL,
    value INTEGER NOT NULL,
    scope TEXT NOT NULL DEFAULT '',
    expires TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    customer TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
);
"""

# (table, column, DDL) columns added after the first release.
_COLUMNS = [
    ("children", "parent_id", "parent_id TEXT REFERENCES accounts(id)"),
    ("children", "settings_json", "settings_json TEXT NOT NULL DEFAULT '{}'"),
    ("children", "initial_needs", "initial_needs TEXT NOT NULL DEFAULT '[]'"),
    ("practice_history", "lesson_id", "lesson_id TEXT"),
    ("practice_history", "phones_json", "phones_json TEXT NOT NULL DEFAULT '[]'"),
]


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db():
    """Connection that commits on success, rolls back on error and always closes."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _add_column(conn, table, column, ddl):
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def init_schema():
    with db() as conn:
        conn.executescript(SCHEMA)
        for table, column, ddl in _COLUMNS:
            _add_column(conn, table, column, ddl)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_history_child ON practice_history(child_id, created_at)")


def init_db():
    """Create/upgrade the schema, then seed reference data and (outside production) demo accounts."""
    init_schema()
    from .seed import seed_all  # imported here: seed needs the schema and the modules built on it

    seed_all()
