# PathSG client

Vue 3 + TypeScript single-page app for the PathSG education planning platform, styled with
Tailwind CSS 4. It implements the clickable design draft: school directory and profiles, reviews,
accounts and student profile, bookmarks, the education roadmap, and the admin dataset panel.

## Setup

```sh
npm install
cp .env.example .env   # VITE_API_URL (FastAPI server) and VITE_PORT (dev server)
```

## Scripts

| Command              | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with hot reload    |
| `npm run build`      | Type-check, then build for production        |
| `npm run type-check` | Type-check app and test sources with vue-tsc |
| `npm test`           | Run the Vitest suite once                    |
| `npm run test:watch` | Run Vitest in watch mode                     |
| `npm run format`     | Format `src/` with Prettier                  |

## Docker

`Dockerfile` builds the site and serves it with nginx, which also proxies `/api/` to the server
(`nginx.conf.template`, upstream set by `API_UPSTREAM`). Images are published by GitHub Actions;
see [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for running and releasing them.

## What talks to the server

Everything the app shows comes from the FastAPI server in `../server`, so start it before the
client.

| Area                                   | Endpoints                                     | Client code                                                  |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Register, log in, log out, role        | `/user/*`                                     | `services/authService.ts`, `stores/auth.ts`                  |
| Directory and school profiles          | `/school-api`, `/school-api/{school_key}`     | `services/schoolService.ts`, `stores/directory.ts`           |
| Distances from a postal code           | `/location/{postal}`                          | `services/locationService.ts`, `stores/location.ts`          |
| Student profile                        | `/profile`                                    | `services/profileService.ts`, `stores/profile.ts`            |
| Bookmarks                              | `/bookmark`                                   | `services/bookmarkService.ts`, `stores/bookmarks.ts`         |
| Reviews                                | `/review`                                     | `services/reviewService.ts`, `stores/reviews.ts`             |
| Rule-based and AI roadmaps, saved plan | `/roadmap/*`                                  | `services/roadmapService.ts`, `stores/roadmap.ts`            |
| School data update (admin)             | `/admin/dataset`, `/admin/dataset/update`     | `services/adminService.ts`, `stores/admin.ts`                |

Account pages need a login. Access tokens last five minutes, so every authenticated call goes
through `services/authorizedRequest.ts`: on a 401 it renews the token pair once (concurrent calls
share one renewal, because refresh tokens are single-use) and repeats the call. If the renewal is
refused the session ends and a notice says so. The administrator is whoever the server says has
the `admin` role.

What the school dataset does not have, the app shows as "Not available": fees, financial aid and
scholarships, benchmark history, polytechnics and universities (the Post-Secondary tier lists
junior colleges and integrated schools; the University tier is empty). The PSLE benchmark is the
2017 T-score cut-off, and primary schools show the places taken up to Phase 2B.

Distances are measured from the centre of the postal code's district, the point the server's
rule-based roadmap also uses. The directory fetches a whole tier once and searches, filters, sorts
and pages it in the browser.

## Structure

```
src/
  assets/styles/     Tailwind entry + shared style modules (see below)
  assets/logos/      School badges, named after the school key (spaces as dashes)
  components/
    ui/              Reusable controls: buttons, fields, segmented switch, tiles, modal, cards
    layout/          Header, navigation, notice banner, dialog host
    schools/         Directory cards, filter bar, fee table, benchmarks, bookmark control
    reviews/         Review section, composer (word cap), cards
    roadmap/         Plan panels, plan node list, saved roadmap and editor
    auth/ profile/ admin/ education/
  views/             One component per route
  router/            Routes, guards (login / admin access) and route meta typing
  stores/            Pinia stores holding the SRS business rules
  services/          API client, token renewal, and one service per area of the API
  utils/ data/ types/
  test/              Shared test helpers, school fixtures and a fake PathSG server
```

Tests sit next to the code in `__tests__/` folders: pure utilities, services (each checked against
the API contract), stores (business rules such as the single saved roadmap, one review per school
and AI fault isolation), components, views, route guards, and whole-app user journeys in
`src/__tests__/App.spec.ts`. Stores, views and journeys run against `src/test/fakeApi.ts`, an
in-memory stand-in for the server behind a stubbed `fetch`, so they exercise the real services.

## Styling

Tailwind utilities are used directly in templates. Anything repeated across components lives in
`src/assets/styles/`, one module per concern, all pulled in by `main.css`:

| Module           | Contents                                         |
| ---------------- | ------------------------------------------------ |
| `theme.css`      | Design tokens (`@theme`): colours, font, shadows |
| `base.css`       | Element defaults, focus ring                     |
| `layout.css`     | Page padding and width helpers                   |
| `animations.css` | Keyframes and `animate-*` utilities              |
| `typography.css` | Page / section headings, captions                |
| `buttons.css`    | Buttons, nav links, segmented switches, tiles    |
| `forms.css`      | Field, label, input and validation styles        |
| `surfaces.css`   | Cards, pills, alerts                             |

The same patterns are wrapped as components in `components/ui/` (`BaseButton`, `FormField`,
`SegmentedControl`, `SectionCard`, ...) so pages compose them instead of repeating class lists.
