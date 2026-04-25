# Docs

This folder keeps only the documentation needed to understand and maintain the extension without turning docs into a second copy of the code.

## Files

- `contract.md` — external behavior, full tool payload/result details, and UX guarantees
- `architecture.md` — module boundaries and invariants
- `../skills/ask-user/SKILL.md` — auto-bundled agent-side decision-gate guidance; enabled by default, but can be disabled via `pi config`; inspired by https://github.com/edlsh/pi-ask-user

## Reading order

- start with `contract.md` for behavior
- read `architecture.md` for code layout

## Rule of thumb

If a detail is about implementation mechanics, it should usually live in `src/` or `tests/`, not here.
