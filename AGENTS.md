# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Vite + React client: primitives in `components/`, routed screens in `pages/`, shared state in `context/`, media in `assets/`, and the entry pair `App.jsx` / `main.jsx`. Static assets sit in `public/`. The Express API resides in `server/` (entry `server/server.js`) with `routes/`, `models/`, `middleware/`, `utils/`, plus helper scripts such as `scripts/` and `seedTestAccounts.js`. Tooling config stays in `vite.config.js`, `tailwind.config.js`, and the `.env.*` templates.

## Build, Test, and Development Commands
- `npm run dev` — boot Vite with hot reload on port 5173.
- `npm run start` — run the API; keep it in a parallel shell while developing.
- `npm run build` / `npm run preview` — produce and serve the optimized bundle from `dist/`.
- `npm run lint` — apply the ESLint config before every commit.
- `node server/seedTestAccounts.js` — example utility for seeding local data.

## Coding Style & Naming Conventions
Use ES modules, two-space indentation, and double quotes. Components, contexts, and pages stay PascalCase (`InvoiceList.jsx`, `AuthProvider.jsx`); hooks and helpers are camelCase (`useSocketClient`, `formatCurrency`). Keep UI logic in `components/`, orchestration in `pages/`, and shared state in `context/`. Prefer Tailwind utility classes, falling back to CSS files only for tokens or overrides. Lint often so hooks and unused-variable rules remain quiet.

## Testing Guidelines
Automated tests are not wired in, so attach manual steps and screenshots to every PR. When coverage is added, colocate client specs as `Name.test.jsx` (Vitest recommended) and put API specs under `server/__tests__/` using Jest + Supertest. Target auth, socket updates, exports, and helpers in `server/utils/`, keeping fixtures deterministic for a future `npm test` script.

## Commit & Pull Request Guidelines
History is not bundled here, so use Conventional Commits (`fix(api): guard empty payload`) to keep logs searchable. Group commits by feature or bugfix and reference tickets when available. Each PR should include a summary, test evidence, screenshots for UI work, and callouts for schema or environment changes. Leave drafts open while work is in progress; request review only after linting (and any tests) pass locally.

## Security & Configuration Tips
Duplicate `.env.development.env` or `.env.production.env` to create local `.env` files and keep secrets out of Git. The server expects Mongo URI, JWT secrets, and optional mail credentials—document new keys in PRs. Use the middleware helpers for validation/auth instead of ad-hoc checks, and avoid logging credentials or tokens when debugging sockets.
