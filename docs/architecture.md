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

### UI

- `src/ui/controller.ts` — connects key input, editor lifecycle, and pure state transitions
- `src/ui/input.ts` — raw input to commands
- `src/ui/render.ts` and `src/ui/render-*.ts` — screen rendering
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
- preview questions do not get the synthetic custom-answer option
- deselected option notes stay in UI state
- only selected option notes are emitted in the final result
- editor lifecycle stays in the controller, not in the reducers

## Documentation rule

Docs should explain contracts, responsibilities, and invariants.
Code and tests should explain the rest.
