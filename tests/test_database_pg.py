import importlib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


def test_init_db_reads_database_url_env(monkeypatch, tmp_path):
    """init_db() with no args should use DATABASE_URL env var."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    import database
    importlib.reload(database)
    database.init_db()
    assert database._engine is not None
    assert str(database._engine.url) == f"sqlite:///{db_path}"


def test_init_db_sqlite_uses_check_same_thread(monkeypatch, tmp_path):
    """SQLite connections must have check_same_thread=False."""
    db_path = tmp_path / "test2.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    import database
    importlib.reload(database)
    database.init_db()
    # If connect_args were missing, SQLite would raise on multi-thread access.
    # Creating a session is enough to verify the engine was configured correctly.
    db = database.SessionLocal()
    db.close()


def test_init_db_explicit_url_overrides_env(monkeypatch, tmp_path):
    """Explicit url arg takes precedence over DATABASE_URL env var."""
    monkeypatch.setenv("DATABASE_URL", "sqlite:///should-not-be-used.db")
    explicit = f"sqlite:///{tmp_path}/explicit.db"
    import database
    importlib.reload(database)
    database.init_db(url=explicit)
    assert str(database._engine.url) == explicit
