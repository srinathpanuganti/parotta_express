# Repository Guidelines

## Project Structure & Module Organization
- Root contains `frontend/` (React + CRACO + Tailwind). See `LOCAL_SETUP_INSTRUCTIONS.md` and `QUICK_START.md`.
- App code in `frontend/src`:
  - `components/` (UI, layout; shadcn-style primitives under `components/ui/`),
  - `pages/`, `data/`, `lib/`, `hooks/`.
- Public assets in `frontend/public`.
- Import alias: use `@/` for `src` (e.g., `import { Button } from '@/components/ui/button'`).

## Build, Test, and Development Commands
- `cd frontend && yarn start` — Start dev server via CRACO. Env flags: `DISABLE_HOT_RELOAD=true`, `REACT_APP_ENABLE_VISUAL_EDITS=true`, `ENABLE_HEALTH_CHECK=true`.
- `cd frontend && yarn build` — Production build to `frontend/build`.
- `cd frontend && yarn test` — Run Jest tests (CRA configuration).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; prefer single quotes; end files with newline.
- React 19, functional components + hooks. Co-locate component styles.
- Component files PascalCase (e.g., `Navbar.jsx`); UI primitives keep existing lowercase filenames (e.g., `components/ui/button.jsx`) but export PascalCase symbols.
- Use Tailwind utility classes; keep class lists readable and grouped by layout → spacing → typography.
- Linting: ESLint is available; follow `eslint:recommended` + React/import/jsx-a11y rules. Run `npx eslint .` from `frontend/` if needed.

## Testing Guidelines
- Framework: Jest (via CRA). Test files: `*.test.(js|jsx)` under `src/` (next to code or in `__tests__/`).
- Aim to cover core rendering logic, routing, and critical interactions. Example: `src/components/layout/Navbar.test.jsx`.
- Run locally with `yarn test` (watch mode supported).

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc. Scope example: `feat(frontend): add corporate menu page`.
- PRs must include: concise description, screenshots/GIFs for UI changes, linked issues, and clear test/verification notes. Keep changes focused and avoid unrelated refactors.

## Security & Configuration
- Do not commit secrets. Prefer `.env.local` for developer overrides; reference `frontend/.env` for keys and feature flags.
- CRACO plugins: visual-edits and health-check are dev-only; toggle via env flags rather than code changes.
