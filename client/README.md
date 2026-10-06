# PathSG client

Vue 3 + TypeScript single-page app for the PathSG education planning platform, styled with Tailwind CSS 4.

## Setup

```sh
npm install
cp .env.example .env   # API base URL and dev server port
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

## Styling

Tailwind utilities are used directly in templates. Anything repeated across components lives in
`src/assets/styles/`, one module per concern, all pulled in by `main.css`:

| Module            | Contents                                           |
| ----------------- | -------------------------------------------------- |
| `theme.css`       | Design tokens (`@theme`): colours, font, shadows   |
| `base.css`        | Element defaults, focus ring                       |
| `animations.css`  | Keyframes and `animate-*` utilities                |
| `typography.css`  | Page / section headings, captions                  |
| `buttons.css`     | Buttons, nav links, segmented switches, tiles      |
| `forms.css`       | Field, label, input and validation styles          |
| `surfaces.css`    | Cards, pills, alerts                               |
