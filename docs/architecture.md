# Architecture

The codebase is split so the implementation reads through file boundaries and names, not through large explanatory docs.

## Design goals

- thin pi-specific wiring
- pure, testable state transitions
- rendering separated from decision logic
- a small stable tool contract

## Module map

### Tool surface

- `src/index.ts` — extension entrypoint
- `src/ask-tool.ts` — tool registration, non-interactive fallback, transcript rendering
- `src/schema.ts` — TypeBox schema
- `src/types.ts` — shared types

### State

- `src/state/normalize.ts` — normalize incoming questions
- `src/state/answers.ts` — mutate and serialize answers
- `src/state/selectors.ts` — read-only selectors
- `src/state/transitions.ts` — navigation, selection, notes, input, submit, cancel
- `src/state/result.ts` — convert UI state to `AskResult`
- `src/state/view.ts` — view-mode helpers
- `src/state.ts` — state barrel used by UI and tests

### Config

- `src/config/defaults.ts` — canonical runtime defaults
- `src/config/schema.ts` — persisted config schema and runtime type
- `src/config/migrate.ts` — persisted-file validation/migration boundary, including keymap normalization/fallback
- `src/config/store.ts` — load/save/backup/runtime subscription store

### UI

- `src/ui/controller.ts` — connects key input, editor lifecycle, live config subscription, dirty-dismiss confirmation, and pure state transitions
- `src/ui/input.ts` — raw input to commands using resolved config-backed keymaps
- `src/ui/dismiss-guard.ts` — pure helpers for dirty-flow exit confirmation behavior
- `src/ui/render.ts` and `src/ui/render-*.ts` — screen rendering, including config-backed footer/keymap hints
- `src/ui/settings-state.ts` — pure settings-modal draft/dirty/notice state
- `src/ui/settings-modal.ts` / `src/ui/show-settings-modal.ts` — ask settings modal rendering and launcher
- `src/ui/constants.ts` and `src/ui/render-types.ts` — rendering constants/contracts
- `src/ask-component.ts` — thin custom UI export

### Result formatting

- `src/result-format.ts` — shared summary/result line formatting
- `src/result.ts` — final result rendering
- `src/text.ts` / `src/constants.ts` — shared display strings

### Tests

- `tests/state.test.ts` — state transitions and serialization
- `tests/input.test.ts` — editing/navigation key behavior
- `tests/result.test.ts` — summaries and transcript output
- `tests/render-*.test.ts` / `tests/text.test.ts` — rendering helpers

## Invariants worth preserving

- submit is never blocked by unanswered questions
- single-select answers serialize as arrays
- single-select free-form answers replace selected options for that question
- multi-select free-form answers augment selected options instead of clearing them
- preview questions keep their preview-pane behavior while also supporting the synthetic custom-answer option
- deselected option notes stay in UI state
- only selected option notes are emitted in the final result
- editor lifecycle stays in the controller, not in the reducers
- persisted ask settings are versioned and normalized before use
- invalid persisted keymaps fall back to default keymaps for the current session without discarding valid behaviour settings
- settings modal edits a local draft and only persists modal changes on explicit save
- when the ask config file is missing, the first ask use writes a default persisted config snapshot
- live config updates can affect an in-progress ask flow immediately

## Documentation rule

Docs should explain contracts, responsibilities, and invariants.
Code and tests should explain the rest.
