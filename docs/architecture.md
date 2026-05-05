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
- `src/ask-tool.ts` — tool registration, non-interactive fallback, transcript rendering, ask payload capture
- `src/answer-commands.ts` — `/answer`, `/answer:again`, and `/ask:replay` command wiring
- `src/answer-extraction.ts` — configured extraction model selection and raw-JSON extraction retries
- `src/ask-payload-store.ts` — branch-aware persisted ask payload lookup
- `src/notifications.ts` — best-effort ask notification payload rendering and channel execution
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
- `src/config/migrate.ts` — persisted-file validation boundary, including schema migration and context-aware keymap normalization/fallback
- `src/config/migrations/` — ordered schema-version migration framework for persisted config shape changes
- `src/config/path-migrations.ts` — file-location migration before config load
- `src/config/store.ts` — load/save/backup/runtime subscription store

### UI

- `src/ui/controller.ts` — connects key input, editor lifecycle, live config subscription, dirty-dismiss confirmation, and pure state transitions
- `src/ui/input.ts` — raw input to commands using resolved context-aware config-backed keymaps
- `src/ui/dismiss-guard.ts` — pure helpers for dirty-flow exit confirmation behavior
- `src/ui/render.ts` and `src/ui/render-*.ts` — screen rendering, including config-backed footer/keymap hints
- `src/ui/settings-list.ts` / `src/ui/show-settings.ts` — lightweight ask settings list rendering and launcher
- `src/ui/constants.ts` and `src/ui/render-types.ts` — rendering constants/contracts

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
- persisted ask settings are migrated to the current schema version, validated, and normalized before use
- config schema migrations preserve user-provided values and add new defaults only when fields are absent
- replay payload lookup scans only the current session branch and revalidates payloads before use
- invalid persisted keymaps fall back to default keymaps for the current session without discarding valid behaviour, notification, or answer settings
- invalid notification channels are skipped and fall back to the default bell channel if none are valid
- ask settings behaviour and notification enabled changes persist immediately from the settings list
- when the ask config file is missing, the first ask use writes a default persisted config snapshot under `~/.pi/agent/extensions/`
- legacy root config files move into `~/.pi/agent/extensions/` only when the current config file is absent
- live config updates can affect an in-progress ask flow immediately

## Documentation rule

Docs should explain contracts, responsibilities, and invariants.
Code and tests should explain the rest.
