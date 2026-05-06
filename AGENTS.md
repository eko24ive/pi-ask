# AGENTS.md

Guidance for agents working in this repository.

## Project scope

This repo builds a **pi.dev extension** that adds an `ask` / interview-style user question flow.

Primary deliverables:

- `src/` — implementation
- `tests/` — behavior coverage
- `docs/` — contract and architecture

## Project goals

Optimize for:

1. **pi-native design**
   - prefer `pi.registerTool()`
   - prefer `ctx.ui.custom()` for complex flows
   - keep results compatible with normal pi tool results

2. **testable architecture**
   - keep state logic in plain TypeScript modules
   - keep pi/TUI wiring thin
   - prefer testing transitions and serialization over terminal rendering details

3. **small docs, clear code**
   - keep implementation consistent with `docs/contract.md`
   - update docs when behavior changes materially
   - keep docs focused on contracts and boundaries, not line-by-line explanations

## Tech stack

- TypeScript
- pnpm
- Biome
- pi extension APIs from `@mariozechner/pi-coding-agent`
- TUI components from `@mariozechner/pi-tui`
- TypeBox for tool schemas

## Commands

Use these project commands:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm format
pnpm lint
pnpm check
```

Notes:

- `pnpm check` runs Biome write/check flow for this repo.
- `pnpm test` runs the Node test runner against `tests/*.test.ts`.
- the extension is intended to be loaded dynamically with:

```bash
pi -e ./src/index.ts
```

## File-specific guidance

### `src/`

- keep implementation in TypeScript only
- preserve the separation between:
  - schema/types
  - state logic
  - UI component logic
  - tool registration
- avoid introducing unnecessary framework abstractions
- prefer small pure helper functions where possible

### `tests/`

- add or update tests when changing state behavior
- prefer focused tests for:
  - question normalization
  - selection behavior
  - tab movement
  - custom answer submission
  - result summarization
  - cancellation behavior

### docs

Keep docs short and synced with the implementation.

- `README.md`: install, run, and use
- `docs/README.md`: docs index
- `docs/contract.md`: external behavior and UX guarantees
- `docs/architecture.md`: module boundaries and invariants
- when the README `last commit` badge uses a `?v=<commit-sha>` cache-busting param, update that SHA when the badge is stale and you are already touching `README.md` for a related docs/release refresh

## Coding expectations

- follow Biome/Ultracite formatting and lint expectations
- prefer explicit, readable code over clever code
- use descriptive names
- use early returns to keep control flow simple
- avoid dead code and generic boilerplate comments
- do not add React/JSX-specific patterns unless the repo actually starts using them

## What to avoid

- do not add unrelated framework guidance or dependencies
- do not add browser/web UI unless the task explicitly requires it
- do not hardcode machine-specific paths
- do not weaken type safety just to silence errors
- do not commit editor-specific files unless they are clearly project-useful

## When changing behavior

Update the relevant docs in the same change:

- usage changes -> `README.md`
- contract or UX changes -> `docs/contract.md`
- module boundary changes -> `docs/architecture.md`

## Preferred workflow

1. read the relevant docs first
2. inspect the existing implementation before refactoring
3. make the smallest coherent change
4. run:
   - `pnpm format`
   - `pnpm typecheck`
   - `pnpm test`
5. update docs if behavior or expectations changed
