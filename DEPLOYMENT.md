# Deployment

PathSG ships as two container images, built and published to GitHub Container Registry by
GitHub Actions:

| Image                                                  | Contents                                           |
| ------------------------------------------------------ | -------------------------------------------------- |
| `ghcr.io/aungkhant169/2006_scsl_team2project/client`   | The built site served by nginx (port 8080)         |
| `ghcr.io/aungkhant169/2006_scsl_team2project/server`   | The FastAPI API (port 8000), migrates on start-up  |

The client's nginx also forwards `/api/*` to the server, so the browser only talks to one origin
and no CORS or API address needs configuring.

## Run it

Needs Docker with the Compose plugin.

```sh
cp .env.example .env     # set SECRET_KEY (openssl rand -hex 32)
docker compose pull
docker compose up -d
```

The site is then at <http://localhost:8080>. To build the images from the checkout instead of
pulling them, use `docker compose up -d --build`.

| Setting                 | Default                                         | Purpose                                                                              |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `SECRET_KEY`            | none, required                                  | Signs login tokens. Keep it stable and secret                                        |
| `FRONTEND_ORIGIN`       | `http://localhost:8080`                         | Address users open, for the API's CORS allow-list                                    |
| `HTTP_PORT`             | `8080`                                          | Host port the site is published on                                                   |
| `IMAGE_TAG`             | `latest`                                        | Image tag to run: `latest`, `1.2.3`, `sha-<commit>`                                  |
| `IMAGE_PREFIX`          | `ghcr.io/aungkhant169/2006_scsl_team2project`   | Registry namespace, change if you run a fork                                         |
| `ADMIN_USERNAMES`       | empty                                           | Usernames allowed to run the school data update through the older `POST /school-api/admin/refresh` route only. They do **not** get the Admin panel (see below) |
| `OPENAI_API_KEY`        | empty                                           | Key for the AI-generated roadmap. Without it that plan answers 503                   |
| `OPENAI_MODEL`          | `gpt-5.5`                                       | Model used for the AI-generated roadmap. Leaving it empty uses the default           |
| `AI_RATE_LIMIT`         | `10`                                            | AI roadmaps one account may generate per window                                      |
| `AI_RATE_WINDOW`        | `300`                                           | Length of that window, in seconds                                                    |
| `LOGIN_RATE_LIMIT`      | `5`                                             | Login attempts per username and address per window                                   |
| `LOGIN_RATE_WINDOW`     | `300`                                           | Length of that window, in seconds                                                    |
| `TRUSTED_PROXY_HOPS`    | `1`                                             | Proxies in front of the server (the client's nginx is the first)                     |
| `BACKUP_INTERVAL_HOURS` | `24`                                            | Hours between database backups. `0` turns them off                                   |
| `BACKUP_KEEP`           | `7`                                             | How many backups to keep. The oldest are deleted                                     |

These are read from the `.env` file next to `docker-compose.yml`, or from the shell. Only
`SECRET_KEY` is required. The client container also takes `CLIENT_MAX_BODY_SIZE` (default `250m`),
the largest request nginx forwards to the API. The school data update uploads up to eleven CSV files
of 20 MB each, so keep it at least that large: nginx's own default of 1 MB would reject them.

To make an administrator, register the account first, then give it the admin role (the Admin panel and
the `/admin/*` routes read the stored role, which `ADMIN_USERNAMES` does not change):

```sh
docker compose exec server python -m scripts.make_admin <username>            # add --remove to undo
```

Data is kept in the `pathsg-data` volume (a SQLite file), so it survives `docker compose down`
and upgrades. `docker compose down -v` deletes it, backups included. The server must run as a
single instance: the database is SQLite and the school data update lock is held in memory.

To serve over HTTPS, put a TLS-terminating proxy in front of the client container and set
`FRONTEND_ORIGIN` to the public `https://` address. Also, set `TRUSTED_PROXY_HOPS=2` so the
login limit sees each visitor's actual address, which requires the proxy to append the
`X-Forwarded-For` header.

## Backups

The server copies the database to `/data/backups` (in the same volume) once every 24 hours, as
`pathsg-YYYYMMDD-HHMMSS.db` (UTC), and keeps the newest seven. The copy is made while the site is
running. It is also made when the server starts if the newest one is more than 24 hours old, so a
server that was down for a day backs up as soon as it is back. Change the interval and the number
kept with `BACKUP_INTERVAL_HOURS` and `BACKUP_KEEP`.

The backups protect against crashes and restarts, and against a bad school data update. They live
on the same volume, so they do not protect against losing the volume or the host: copy them
elsewhere if that matters.

To restore one, stop the server, put the backup in place of the database, and start it again:

```sh
docker compose stop server
docker compose run --rm --no-deps --entrypoint cp server \
  /data/backups/pathsg-YYYYMMDD-HHMMSS.db /data/main.db
docker compose start server
```

To copy the newest backup to the host:

```sh
docker compose cp server:/data/backups ./backups
```

## Upgrade

```sh
docker compose pull && docker compose up -d
```

Pin `IMAGE_TAG` to a release version for repeatable deployments.

## Workflows

| Workflow                        | Runs on                               | Does                                                                                           |
| ------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | Pull requests, manual                 | Client: format, type-check, tests, build. Server: ruff lint and format, pytest. Builds both Docker images and validates the compose file (nothing is pushed) |
| `.github/workflows/publish.yml` | Push to `main`, `v*.*.*` tags, manual | Runs CI first, then pushes `linux/amd64` and `linux/arm64` images to ghcr.io                   |

Tags pushed to ghcr.io:

- push to `main`: `latest`, `main`, `sha-<commit>`
- release tag `v1.2.3`: `1.2.3`, `1.2`, `sha-<commit>`

To cut a release: `git tag v1.2.3 && git push origin v1.2.3`.

### One-time setup

- **Package visibility.** Images published from a personal repository start private. To pull
  without logging in, open the package on GitHub (profile, Packages, the image, Package settings)
  and change its visibility to public, or log in on the host with
  `docker login ghcr.io` and a token that has `read:packages`.
- **Actions permissions.** Publishing uses the built-in `GITHUB_TOKEN` with `packages: write`, set
  in the workflow itself. If the repository or organisation restricts workflow permissions
  further, allow GitHub Actions to write packages.
- **Branch protection.** To block merging a failing change, require the CI jobs as status checks
  on `main`: "Client (format, types, tests, build)", "Server (lint, format, tests)",
  "Build client image" and "Build server image".
