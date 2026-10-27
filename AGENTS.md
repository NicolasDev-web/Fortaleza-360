# Repository Guidelines

## Project Structure & Module Organization

The application lives in `fortaleza-saude-360/`; run project commands from that directory. Next.js App Router source is in `app/` (`page.tsx`, `layout.tsx`, and global styles). Static runtime assets belong in `public/`, while design references and mockups live in `references/`. Product, architecture, data, privacy, and deployment decisions are documented in `docs/`. Work is organized as atomic specifications in `sdd/tasks/`, with progress recorded in `sdd/STATUS.md`. Data-pipeline templates are under `scripts/`.

Before changing application code, read `fortaleza-saude-360/AGENTS.md` and the relevant SDD task; its stricter rules apply within that subtree.

## Build, Test, and Development Commands

Use Node.js 20+:

- `cd fortaleza-saude-360 && npm install` installs dependencies.
- `npm run dev` starts the local Next.js server at `http://localhost:3000`.
- `npm run lint` runs ESLint with Next.js Core Web Vitals and TypeScript rules.
- `npm run typecheck` checks strict TypeScript without emitting files.
- `npm run build` creates the production build; `npm run start` serves it.

## Coding Style & Naming Conventions

Write strict TypeScript and React function components. Use two-space indentation, `PascalCase` for components and types, `camelCase` for functions and variables, and descriptive lowercase route or asset names. Prefer the `@/*` import alias for project modules. Keep UI text in Brazilian Portuguese and preserve accessibility: semantic HTML, keyboard operation, and WCAG AA contrast. No formatter is configured, so match nearby code and rely on ESLint.

## Testing Guidelines

There is not yet an automated `npm test` script. Every change must pass `npm run lint`, `npm run typecheck`, and `npm run build`. Manually verify desktop/mobile layouts, keyboard navigation, missing-data states, and network failures. When completing an SDD task, record test evidence in `sdd/STATUS.md`; do not mark acceptance criteria complete without it.

## Commit & Pull Request Guidelines

Git history currently contains only `init`, so follow the documented project pattern: `feat(f360): SDD-012 short description`; use `fix`, `docs`, or `chore` when appropriate. Keep commits scoped to one microtask. Pull requests should identify the SDD task, summarize changes and risks, list validation commands, link issues, and include screenshots for UI changes.

## Data, Security & Configuration

Copy `.env.example` locally and never commit secrets or paid API keys. Synthetic values must remain clearly labeled `DEMO`. Do not add personal health data or unverified facility statistics; document source, date, license, and limitations for every dataset.
