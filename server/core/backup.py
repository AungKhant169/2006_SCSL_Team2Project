"""Daily backup of the SQLite database (SAFE-1).

A copy is made with SQLite's online backup, so it is consistent even while requests are writing,
and is written under a temporary name first so a half-written file is never taken for a backup.
How recent the newest copy is decides when the next one is due, so restarting the server does not
reset the 24 hour clock: a server that was down for a day backs up as soon as it starts.
"""

import asyncio
import logging
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from core.settings import settings
from models.base import engine

log = logging.getLogger(__name__)

PREFIX = "pathsg-"
SUFFIX = ".db"
# How long to wait before trying again after a backup failed (full disk, ...).
RETRY_SECONDS = 600


class DatabaseBackup:
    @staticmethod
    def source() -> Path | None:
        """The database file, or None when the database is not a SQLite file."""
        url = engine.url
        if url.get_backend_name() != "sqlite" or url.database in (None, "", ":memory:"):
            return None
        return Path(url.database).resolve()

    @classmethod
    def directory(cls) -> Path | None:
        if settings.backup_dir:
            return settings.backup_dir
        return source.parent / "backups" if (source := cls.source()) else None

    @classmethod
    def existing(cls) -> list[Path]:
        """The backups on disk, oldest first. Their names sort by time."""
        folder = cls.directory()
        if folder is None or not folder.is_dir():
            return []
        return sorted(folder.glob(f"{PREFIX}*{SUFFIX}"))

    @classmethod
    def run(cls, now: datetime | None = None) -> Path | None:
        """Copy the database into the backup folder and delete the oldest copies beyond
        BACKUP_KEEP. Returns the new file, or None when there is no SQLite file to copy."""
        source, folder = cls.source(), cls.directory()
        if source is None or folder is None or not source.exists():
            return None

        stamp = (now or datetime.now(timezone.utc)).strftime("%Y%m%d-%H%M%S")
        target = folder / f"{PREFIX}{stamp}{SUFFIX}"
        partial = target.with_name(target.name + ".part")
        folder.mkdir(parents=True, exist_ok=True)
        try:
            with (
                closing(
                    sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True)
                ) as copy_from,
                closing(sqlite3.connect(partial)) as copy_to,
            ):
                copy_from.backup(copy_to)
            partial.replace(target)
        finally:
            partial.unlink(missing_ok=True)

        for old in cls.existing()[: -settings.backup_keep]:
            old.unlink(missing_ok=True)
        log.info("Database backed up to %s", target)
        return target

    @classmethod
    def seconds_until_due(cls, now: datetime | None = None) -> float:
        """0 when the newest backup is older than the interval, or there is none."""
        interval = settings.backup_interval_hours * 3600
        if not (backups := cls.existing()):
            return 0
        newest = datetime.fromtimestamp(backups[-1].stat().st_mtime, timezone.utc)
        age = ((now or datetime.now(timezone.utc)) - newest).total_seconds()
        return max(0.0, interval - age)

    @classmethod
    async def schedule(cls) -> None:
        """Back up whenever one is due, for as long as the server runs."""
        if settings.backup_interval_hours <= 0:
            log.info("Database backups are turned off")
            return
        if cls.source() is None:
            log.warning("Database backups need a SQLite database; none will be made")
            return
        while True:
            delay = cls.seconds_until_due()
            if delay <= 0:
                try:
                    made = await asyncio.to_thread(cls.run)
                except Exception:
                    log.exception("Database backup failed")
                    delay = RETRY_SECONDS
                else:
                    # Nothing to copy yet when the database file does not exist.
                    delay = cls.seconds_until_due() if made else RETRY_SECONDS
            await asyncio.sleep(delay)
