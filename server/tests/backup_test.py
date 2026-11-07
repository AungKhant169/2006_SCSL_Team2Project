import asyncio
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from core import backup
from core.backup import DatabaseBackup
from core.settings import settings
from main import app
from models.user import User
from tests.conftest import USER, client

NOW = datetime(2026, 11, 7, 4, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def backup_folder(tmp_path, monkeypatch):
    """Keep the copies out of the folder the other tests' database lives in."""
    monkeypatch.setattr(settings, "backup_dir", tmp_path / "backups")
    monkeypatch.setattr(settings, "backup_keep", 3)
    monkeypatch.setattr(settings, "backup_interval_hours", 24)
    return tmp_path / "backups"


def make_old(path, hours):
    """Make a backup look like it was written `hours` ago."""
    then = (NOW - timedelta(hours=hours)).timestamp()
    os.utime(path, (then, then))


def test_backup_is_a_working_copy_of_the_database(authenticated):
    path = DatabaseBackup.run(NOW)

    assert path and path.name == "pathsg-20261107-040000.db"
    with closing(sqlite3.connect(path)) as copy:
        names = [row[0] for row in copy.execute("SELECT username FROM users")]
    assert names == [USER["username"]]


def test_backup_does_not_change_the_database(authenticated):
    DatabaseBackup.run(NOW)
    assert User.get_by_key(username=USER["username"]) is not None


def test_no_partial_file_is_left_behind(backup_folder):
    DatabaseBackup.run(NOW)
    assert [p.suffix for p in backup_folder.iterdir()] == [".db"]


def test_only_the_newest_copies_are_kept(backup_folder):
    for day in range(1, 6):
        DatabaseBackup.run(NOW + timedelta(days=day))

    assert [p.name for p in DatabaseBackup.existing()] == [
        "pathsg-20261110-040000.db",
        "pathsg-20261111-040000.db",
        "pathsg-20261112-040000.db",
    ]


def test_other_files_in_the_folder_are_left_alone(backup_folder):
    backup_folder.mkdir()
    (backup_folder / "notes.txt").write_text("mine")
    for day in range(1, 6):
        DatabaseBackup.run(NOW + timedelta(days=day))
    assert (backup_folder / "notes.txt").exists()


def test_backup_goes_next_to_the_database_by_default(monkeypatch):
    monkeypatch.setattr(settings, "backup_dir", None)
    assert DatabaseBackup.directory() == DatabaseBackup.source().parent / "backups"


def test_nothing_is_copied_before_the_database_exists(monkeypatch, tmp_path):
    monkeypatch.setattr(DatabaseBackup, "source", lambda: tmp_path / "missing.db")
    assert DatabaseBackup.run(NOW) is None


class TestWhenDue:
    def test_due_at_once_with_no_backup(self):
        assert DatabaseBackup.seconds_until_due(NOW) == 0

    def test_not_due_just_after_a_backup(self):
        path = DatabaseBackup.run(NOW)
        make_old(path, hours=1)
        assert DatabaseBackup.seconds_until_due(NOW) == pytest.approx(23 * 3600)

    def test_due_once_the_interval_has_passed(self):
        path = DatabaseBackup.run(NOW)
        make_old(path, hours=25)
        assert DatabaseBackup.seconds_until_due(NOW) == 0

    def test_follows_the_configured_interval(self, monkeypatch):
        monkeypatch.setattr(settings, "backup_interval_hours", 2)
        path = DatabaseBackup.run(NOW)
        make_old(path, hours=1)
        assert DatabaseBackup.seconds_until_due(NOW) == pytest.approx(3600)

    def test_the_newest_copy_decides(self):
        old = DatabaseBackup.run(NOW - timedelta(days=3))
        fresh = DatabaseBackup.run(NOW)
        make_old(old, hours=72)
        make_old(fresh, hours=1)
        assert DatabaseBackup.seconds_until_due(NOW) > 0


class TestSchedule:
    def run_for(self, seconds):
        async def go():
            await asyncio.wait_for(DatabaseBackup.schedule(), seconds)

        with pytest.raises(asyncio.TimeoutError):
            asyncio.run(go())

    def test_backs_up_straight_away_when_due(self, backup_folder):
        self.run_for(2)
        assert len(DatabaseBackup.existing()) == 1

    def test_does_not_back_up_again_before_the_interval(self, backup_folder):
        self.run_for(2)
        self.run_for(1)
        assert len(DatabaseBackup.existing()) == 1

    def test_a_failed_backup_is_retried_later_not_in_a_loop(self, monkeypatch):
        calls = []

        def fail(now=None):
            calls.append(now)
            raise OSError("disk full")

        sleeps = []

        async def sleep(seconds):
            sleeps.append(seconds)
            raise asyncio.CancelledError

        monkeypatch.setattr(DatabaseBackup, "run", fail)
        monkeypatch.setattr(backup.asyncio, "sleep", sleep)

        with pytest.raises(asyncio.CancelledError):
            asyncio.run(DatabaseBackup.schedule())
        assert len(calls) == 1
        assert sleeps == [backup.RETRY_SECONDS]

    def test_turned_off_with_zero_hours(self, monkeypatch, backup_folder):
        monkeypatch.setattr(settings, "backup_interval_hours", 0)
        asyncio.run(DatabaseBackup.schedule())
        assert DatabaseBackup.existing() == []

    def test_needs_a_sqlite_database(self, monkeypatch, backup_folder):
        monkeypatch.setattr(DatabaseBackup, "source", lambda: None)
        asyncio.run(DatabaseBackup.schedule())
        assert DatabaseBackup.existing() == []


def test_the_server_schedules_backups_while_it_runs(backup_folder):
    with TestClient(app) as running:
        assert running.get("/").status_code == 200
        for _ in range(100):
            if DatabaseBackup.existing():
                break
            asyncio.run(asyncio.sleep(0.05))
    assert len(DatabaseBackup.existing()) == 1


def test_requests_do_not_need_the_scheduler():
    """The other tests use the client without running the app's startup."""
    assert client.get("/").status_code == 200
