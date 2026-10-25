# PathSG server

FastAPI service behind the PathSG education planning platform. It handles accounts, the Singapore
school directory, school reviews, bookmarks, saved education roadmaps (rule-based and AI-generated)
and the administrator school data update. Data lives in SQLite through SQLAlchemy, with schema
changes managed by Alembic.

Run every command below from this folder (`server/`): imports and the Alembic config assume it is
the working directory.

## Setup

Needs Python 3.14 (what CI and the Docker image use).

```sh
python3 -m venv .venv
source .venv/bin/activate                # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                     # then set SECRET_KEY
alembic upgrade head                     # create the database tables
python -m scripts.refresh_school_data    # clean data/raw/*.csv and load the schools
uvicorn main:app --reload                # http://127.0.0.1:8000
```

Interactive API docs are at <http://127.0.0.1:8000/docs>. `GET /` is a plain health check.

The migrations only create tables. Until `scripts.refresh_school_data` has run, the school directory
is empty and roadmaps have nothing to recommend. See [School data](#school-data) for what it loads.

### Administrators

Registration always creates plain users, so administrators are made out of band. Register the
account first, then use either:

```sh
python -m scripts.make_admin <username>             # sets the stored role to admin
python -m scripts.make_admin <username> --remove    # back to a normal user
```

or list the username in `ADMIN_USERNAMES` (comma separated, in `.env`). The two are not equivalent:
`ADMIN_USERNAMES` is only honoured by `POST /school-api/admin/refresh`, while the `/admin/*` routes
and `GET /user/identity` look at the stored role. Use `make_admin` for an account that should be an
administrator everywhere. `scripts.promote_admin <username>` is an older script that does the same
as `make_admin` without `--remove`.

## Configuration

Read from the environment, and from `server/.env` when present (`python-dotenv`). `SECRET_KEY` and
`FRONTEND_ORIGIN` have no default: the server fails to start without them.

| Variable              | Default                 | Purpose                                                                          |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `SECRET_KEY`          | none, required          | Signs access tokens. Generate with `openssl rand -hex 32`                        |
| `FRONTEND_ORIGIN`     | none, required          | The one origin allowed by CORS, e.g. `http://localhost:8080`                     |
| `DATABASE_URL`        | `sqlite:///./main.db`   | SQLAlchemy URL. The default is `server/main.db`                                  |
| `ADMIN_USERNAMES`     | empty                   | Usernames treated as admins by the school data update (see above)                |
| `SCHOOL_MAX_UPLOAD_MB`| `20`                    | Largest CSV accepted per file by the school data update                          |
| `SCHOOL_RAW_DIR`      | `data/raw`              | Where uploaded CSVs are kept for the next refresh. Docker uses `/data/school_raw`|
| `OPENAI_API_KEY`      | none                    | Needed by `POST /roadmap/generate-ai-roadmap`; without it that endpoint returns 503 |
| `OPENAI_MODEL`        | `gpt-5.5`               | Model used for AI roadmaps                                                       |

`.env` is git-ignored. Only `.env.example` is tracked.

## Commands

The [`Justfile`](Justfile) wraps the everyday tasks. It calls `.venv/bin/...`, so on Windows run the
plain command from the second column instead (with the venv activated).

| `just` recipe          | Plain command                                      | Purpose                                      |
| ---------------------- | -------------------------------------------------- | -------------------------------------------- |
| `just dev`             | `uvicorn main:app --reload`                        | Run with auto-reload                         |
| `just start`           | `uvicorn main:app`                                 | Run without reload                           |
| `just test`            | `python -m pytest`                                 | Run the test suite                           |
| `just check`           | `ruff check`                                       | Lint                                         |
| `just format`          | `ruff format`                                      | Format                                       |
| `just migrate`         | `alembic upgrade head`                             | Apply migrations                             |
| `just revision "msg"`  | `alembic revision --autogenerate -m "msg"`         | Generate a migration from model changes      |
| `just purge`           | none (uses `find`)                                 | Delete `__pycache__` and `.ruff_cache`       |

CI runs `ruff check`, `ruff format --check` and `python -m pytest` on every pull request, so run
them before pushing.

## API

All routes are JSON unless noted. Protected routes take `Authorization: Bearer <access token>`.

| Area      | Route                                  | Auth  | Purpose                                                    |
| --------- | -------------------------------------- | ----- | ---------------------------------------------------------- |
| Account   | `POST /user/register`                  |       | Create an account, returns access and refresh tokens       |
|           | `POST /user/login`                     |       | Log in, returns access and refresh tokens                  |
|           | `POST /user/refresh`                   |       | Exchange a refresh token for a new pair                    |
|           | `POST /user/logout`                    |       | Invalidate a refresh token (204)                           |
|           | `GET /user/identity`                   | user  | The caller's id, username and role                         |
| Profile   | `GET /profile`                         | user  | The student's target level, scores and postal code         |
|           | `PUT /profile`                         | user  | Validate and save the profile, replacing the old one       |
| Location  | `GET /location/{postal}`               |       | The point distances from a postal code are measured from   |
| Schools   | `GET /school-api`                      |       | Filtered, paged search of schools                          |
|           | `GET /school-api/options`              |       | Every value each filter accepts, for dropdowns             |
|           | `GET /school-api/{school_key}`         |       | Full school profile                                        |
|           | `POST /school-api/admin/refresh`       | admin | The school data update below, also open to `ADMIN_USERNAMES` |
| Reviews   | `GET /review/school/{school_id}`       |       | Reviews of a school, newest first                          |
|           | `POST /review/school/{school_id}`      | user  | Add a review (one per account per school)                  |
|           | `PATCH /review/{review_id}`            | owner | Edit own review                                            |
|           | `DELETE /review/{review_id}`           | owner | Delete own review (204)                                    |
| Bookmarks | `GET /bookmark`                        | user  | Bookmarked schools, in the order saved                     |
|           | `PUT /bookmark/{school_id}`            | user  | Bookmark a school, idempotent (204)                        |
|           | `DELETE /bookmark/{school_id}`         | user  | Remove a bookmark, idempotent (204)                        |
| Roadmap   | `POST /roadmap/generate-rule-roadmap`  | user  | Rule-based school ids for a stage, plus the schools' details |
|           | `POST /roadmap/generate-ai-roadmap`    | user  | AI-ranked school ids, plus the schools' details            |
|           | `GET /roadmap`                         | user  | The saved roadmap with its schools (404 if none)           |
|           | `PUT /roadmap`                         | user  | Save a roadmap, replacing any existing one                 |
|           | `PATCH /roadmap`                       | user  | Change the saved roadmap's school choices                  |
|           | `DELETE /roadmap`                      | user  | Delete the saved roadmap (204)                             |
| Admin     | `GET /admin/dataset`                   | admin | Schools in the database and when they were last loaded     |
|           | `POST /admin/dataset/update`           | admin | Upload raw CSVs and reload the school data                 |
|           | `GET /admin/dataset/export`            | admin | Download every school as `pathsg_schools_YYYYMMDD.csv`     |

Schools are addressed by `school_key` (a text slug) in the directory, and by numeric `school_id` in
reviews, bookmarks and roadmaps. Every place that returns schools (search, bookmarks, roadmaps) gives
each one's `id` as well as its `school_key`, so a client never needs a second lookup.

### Accounts and sessions

- Usernames are 1 to 36 letters and digits. Passwords are 8 to 36 printable ASCII characters with at
  least one digit and one special character. Passwords are stored as bcrypt hashes.
- Access tokens are HS256 JWTs that expire after 5 minutes. Refresh tokens are random strings, and
  each is single-use: `/user/refresh` returns a new pair.
- Refresh tokens are kept in the database as SHA-256 digests and expire after 7 days, so a restart or
  redeploy does not sign anyone out. Logging out, or using a token, deletes it.
- A user's role is read from the database on every request, so promoting or demoting an account
  takes effect immediately, with no new token needed.

### School search

`GET /school-api` returns `{total, limit, offset, items}`. Every filter given must match.

- Stage: `stage` (`primary`, `secondary`, `postsec`, `uni`), the schools a roadmap for that stage
  can pick from. Integrated and mixed-level schools belong to every stage they cover (Raffles
  Institution is both secondary and post-secondary). Each school lists its `stages`. The mapping is
  `STAGE_LEVELS` in [`models/school_record.py`](models/school_record.py).
- Text: `q` (name contains), `level` and `mrt` (contains), `area`, `zone`, `school_type`,
  `gendermix`, `nature`, `session`, `mother_tongue`, `alp_domain`, `llp_domain` (exact, ignoring case).
- Flags: `sap`, `autonomous`, `gifted`, `ip`, `ib` (`true` or `false`).
- Repeatable (the school must have all the values given): `bus`, `subject`, `cca`, `moe_programme`.
- CCA details, matched on a single CCA: `cca_category`, `cca_section`, `cca_name`.
- Ranges: `psle_min`/`psle_max`, `rank_min`/`rank_max`, `places_min`/`places_max`.
- Paging: `limit` (1 to 400, default 50) and `offset`.

`/docs` lists them all with descriptions. `GET /school-api/options` returns the valid values to
offer in dropdowns.

### Roadmaps

A request carries `stage` (`preschool`, `primary`, `secondary`, `postsec` or `uni`), and optionally
`postal` (6-digit postal code) and `previous_academic_score`. A roadmap holds 1 to 3 school ids in
preference order, and an account keeps at most one. Every roadmap response lists the chosen
schools' details (`schools`, in the same order as `choices`; an id whose school no longer exists is
left out).

- **Rule-based** ([`core/roadmap_rules.py`](core/roadmap_rules.py)). Primary ranks by distance from
  the student's postal district. Secondary ranks schools the student's PSLE AL score reaches against
  their 2017 cut-off first, then by distance. Post-secondary ranks by subjects and CCAs offered.
  There is no rule-based plan for `uni`.
- **AI** ([`core/roadmap_ai.py`](core/roadmap_ai.py)). Sends the candidate schools for the stage to
  OpenAI with a strict JSON schema, then keeps only valid, unique ids. The username is never sent.
  It gives up after 14 seconds (504), so it answers before the client's 15 second limit, and any other failure or unusable answer is a 503.
- **Distance** ([`core/geolocation.py`](core/geolocation.py)) is approximate: the first two digits of
  the postal code select a postal district, and the distance is measured to that district's centre.
  `GET /location/{postal}` returns that centre, so a client can show the same distances.
- The `psle_2017_cutoff` column is the 2017 PSLE **T-score** cut-off (roughly 190 to 264, higher is
  more selective), not an AL score. The rule-based plan scales it against the candidates, and the AI
  prompt says the same.

### Student profile

`GET /profile` returns the saved profile, or the starting values (`secondary`, no scores, no postal
code) for an account that has none. `PUT /profile` validates and replaces it with the rules the
client form uses: a 6-digit postal code, and for the target level a PSLE AL (4 to 32, whole), an
L1R5 (2 to 54) and/or ELR2B2, or a GPA (0 to 4) and/or A-Level rank points (0 to 90). Scores the
level does not use are dropped. Only these fields are stored, never a name or NRIC.

## School data

The schools come from seven raw CSV files in [`data/raw/`](data/raw/): `general`, `primary`,
`secondary`, `sdp`, `moe`, `ccas` and `subjects`.
[`core/school_cleaning.py`](core/school_cleaning.py) (pandas, no database access) turns them into
clean records, and [`core/school_import.py`](core/school_import.py) writes them. The `schools` table
holds one row per school. Subjects, CCAs, MOE programmes and bus services are in the child tables
`school_subjects`, `school_ccas`, `school_moe_programmes` and `school_buses`, which are rebuilt on
every refresh.

There are three ways to refresh, and all use the same code:

- `python -m scripts.refresh_school_data` reloads from the stored files. With `--if-empty` it does
  nothing when schools are already loaded, which is what the Docker image runs on start-up.
- `POST /admin/dataset/update` (admin role) takes a multipart `files` field with one or more of the
  seven CSVs. Each file is recognised by its column headers, so file names do not matter, and any
  kind not uploaded is taken from the last upload (or the copy in `data/raw/`). This is what the
  client's admin panel uses.
- `POST /school-api/admin/refresh` is the same update, also open to the `ADMIN_USERNAMES` accounts.

Only one update runs at a time (the second gets 409). Every successful load is logged in the
`dataset_updates` table, and `GET /admin/dataset` reports the school count and the time of the last
load.

A refresh is all or nothing: the files are validated and cleaned first, and everything is written in
one transaction. Schools already in the database but missing from the files are kept and counted as
`not_in_files`. Uploaded files are saved to `SCHOOL_RAW_DIR` only after the database update
succeeds. The response summarises the run (`schools`, `added`, `updated`, `not_in_files`, `subjects`,
`ccas`, `moe_programmes`, `buses`, `warnings`).

Failures: 403 when the caller is not an admin, 409 when another update is running, 422 when no file
is sent, a file is not a non-empty `.csv` within `SCHOOL_MAX_UPLOAD_MB`, or the data cannot be
processed, and 503 when the database is unreachable. The request handling and the lock are in
[`core/dataset_update.py`](core/dataset_update.py).

### Export

`GET /admin/dataset/export` (admin role) downloads the stored school data as one CSV file, named
`pathsg_schools_YYYYMMDD.csv` for the Singapore date of the export (`Content-Disposition`, which CORS
exposes so the client can read it). There is one row per school, ordered by name. The columns are
every column of the `schools` table except its internal `id`, followed by the child tables:
`subjects`, `moe_programmes` and `bus_numbers` hold their entries separated by `; `, and each entry of
`ccas` is `grouping | section | category | customised name`. Nothing about accounts, saved roadmaps,
bookmarks or reviews is read. Fails with 503 and `Export Failed: Unable to retrieve school data at
this time.` when the database is unreachable or holds no schools. The code is in
[`core/dataset_export.py`](core/dataset_export.py).

### Errors

Failures return `{"detail": "<message>"}`. Domain errors are enums that extend `HttpError`
([`core/exceptions.py`](core/exceptions.py)), each member being a `(status code, message)` pair that
`main.py` turns into a response. Raise a member (`raise UserError.ADMIN_REQUIRED`) rather than
building an `HTTPException`. Request bodies that fail pydantic validation get FastAPI's standard
422.

## Tests

```sh
python -m pytest
```

Tests live in [`tests/`](tests/) as `*_test.py` files, driven through FastAPI's `TestClient` with no
running server. [`tests/conftest.py`](tests/conftest.py) points the app at a throwaway SQLite
database and sets its own `SECRET_KEY` and `FRONTEND_ORIGIN`, so your `.env` is not used, and resets
every table before each test. Use the `authenticated` and `admin` fixtures for a logged-in user or
administrator. The OpenAI client is replaced with `monkeypatch`; the school data pipeline runs for
real on the bundled CSVs, with uploads redirected to a temporary folder.

## Database migrations

After changing a model in `models/`, generate and review a migration, then apply it:

```sh
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Migrations are in [`core/alembic/versions/`](core/alembic/versions/). The database URL comes from
`DATABASE_URL` through `models/base.py`, not from `alembic.ini`. New models must be imported in
[`models/__init__.py`](models/__init__.py) or autogenerate will not see them.

## Docker

The [`Dockerfile`](Dockerfile) installs the dependencies with `uv`, runs as an unprivileged user,
keeps the SQLite file and uploaded school CSVs on a `/data` volume, and on start-up runs
`alembic upgrade head` and `refresh_school_data --if-empty` before serving on port 8000 with a single
worker. A new deployment therefore starts with the schools loaded. It is built and published by
GitHub Actions and run together with the client by the root [`docker-compose.yml`](../docker-compose.yml).
See [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

To make an administrator, either set `ADMIN_USERNAMES` in the root `.env` (compose passes it to the
container, with the `ADMIN_USERNAMES` caveat above), or promote a registered account:

```sh
docker compose exec server python -m scripts.make_admin <username>
```

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in the root `.env` for AI roadmaps; compose
passes both to the container, and without a key they return 503.

## Structure

```
main.py          App setup: CORS, routers, error handler
routers/         One FastAPI router per area (user, profile, location, school_api, review, bookmark,
                 roadmap, admin)
schemas/         Pydantic request and response models
models/          SQLAlchemy models. Each also holds its own queries and business rules
core/
  authenticator.py   Bearer-token dependencies (Requester, admin guard)
  exceptions.py      HttpError base and its response handler
  roadmap_*.py       Candidate pool, rule-based and AI roadmap generators
  geolocation.py     Postal districts and distance
  school_cleaning.py Raw school CSVs to clean records (pandas)
  school_import.py   Writes cleaned records to the database, keeps uploaded CSVs
  dataset_update.py  Admin school data update: upload checks, the single-update lock
  dataset_export.py  Admin school data export to one CSV file
  alembic/           Migration environment and versions
scripts/         One-off commands: refresh_school_data, make_admin, promote_admin
data/raw/        The seven raw school CSV files
tests/           pytest suite
```

Routers stay thin: they validate input through schemas, call a model or `core/` class method, and
shape the response. Rules and database access belong in `models/` and `core/`.
