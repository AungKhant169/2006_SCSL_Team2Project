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

| Setting         | Default                                         | Purpose                                              |
| --------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `SECRET_KEY`    | none, required                                  | Signs login tokens. Keep it stable and secret        |
| `PUBLIC_ORIGIN` | `http://localhost:8080`                         | Address users open, for the API's CORS allow-list    |
| `HTTP_PORT`     | `8080`                                          | Host port the site is published on                   |
| `IMAGE_TAG`     | `latest`                                        | Image tag to run: `latest`, `1.2.3`, `sha-<commit>`  |
| `IMAGE_PREFIX`  | `ghcr.io/aungkhant169/2006_scsl_team2project`   | Registry namespace, change if you run a fork         |

Data is kept in the `pathsg-data` volume (a SQLite file), so it survives `docker compose down`
and upgrades. `docker compose down -v` deletes it. The server must run as a single instance:
the database is SQLite and refresh tokens are held in memory.

To serve over HTTPS, put a TLS-terminating proxy in front of the client container and set
`PUBLIC_ORIGIN` to the public `https://` address.

## Upgrade

```sh
docker compose pull && docker compose up -d
```

Pin `IMAGE_TAG` to a release version for repeatable deployments.

## Workflows

| Workflow                        | Runs on                              | Does                                                                                           |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | Pull requests, manual                | Client: format, type-check, tests, build. Server: ruff lint and format, pytest. Builds both Docker images and validates the compose file (nothing is pushed) |
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
