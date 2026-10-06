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

## What talks to the server

| Area                                  | Source                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Register, log in, log out, session    | FastAPI `/user/*` endpoints (`src/services/authService.ts`)                  |
| Schools, reviews, bookmarks, profile  | In-memory demo data (`src/data/`, Pinia stores) until endpoints exist        |
| AI roadmap plan, admin dataset update | Simulated services (`src/services/roadmapAiService.ts`, `datasetService.ts`) |

Start the API (`server/`) before using the login page. The server does not return account roles
yet, so the account named `admin` is treated as the administrator (`src/stores/auth.ts`).

Account-scoped demo data (profile, bookmarks, saved roadmap) lives in memory, is seeded with the
design's example values, and is cleared on log out.

### Demonstrating failure states

The simulated services read URL flags when the page loads, so each outcome in the design can be
shown without a backend:

| Flag                     | Effect                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `/?aiOutcome=error`      | The AI roadmap panel fails and offers **Retry AI Generation** |
| `/?adminOutcome=timeout` | Admin update aborts with "Unable to reach API"                |
| `/?adminOutcome=parse`   | Admin update aborts with "Unable to process dataset format"   |

## Structure

```
src/
  assets/styles/     Tailwind entry + shared style modules (see below)
  assets/logos/      School badges, named by school id
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
  services/          API client, auth, simulated AI / dataset services
  utils/ data/ types/
  test/              Shared test helpers
```

Tests sit next to the code in `__tests__/` folders: pure utilities, services, stores (business
rules such as the single saved roadmap, one review per school and AI fault isolation),
components, views, route guards, and whole-app user journeys in `src/__tests__/App.spec.ts`.

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
