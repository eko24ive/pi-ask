# Ask tool contract

`ask_user` is a pi-native clarification tool for cases where implementation depends on user preference or missing requirements.

This document defines the stable external behavior. It does not explain internal helper-by-helper implementation.

## Input

```ts
{
  title?: string;
  questions: Array<{
    id: string;
    label?: string;
    prompt: string;
    type?: "single" | "multi" | "preview";
    required?: boolean;
    options: Array<{
      value: string;
      label: string;
      description?: string;
      preview?: string;
    }>;
  }>;
}
```

## Input rules

- at least one question is required
- every question must have non-empty trimmed `id` and `prompt`
- every question must have at least one option
- question ids must be unique within one tool call
- option `value`s must be unique within a question
- optional `label`, `description`, and `preview` fields must not be blank when provided
- `label` falls back to `Q1`, `Q2`, ...
- `type` defaults to `single`
- `required` defaults to `false`
- `required` is metadata only; it never blocks submission
- preview questions require preview text for every declared option; option descriptions do not satisfy this requirement, and invalid preview payloads report a fix hint to add preview text or switch to `type: "single"`
- all questions get an internal `Type your own` option

## Output

```ts
{
  content: [{ type: "text"; text: string }];
  details: {
    title?: string;
    cancelled: boolean;
    error?: {
      kind: "invalid_input";
      issues: Array<{
        path: string;
        message: string;
      }>;
    };
    mode: "submit" | "elaborate";
    questions: Array<{
      id: string;
      label: string;
      prompt: string;
      type: "single" | "multi" | "preview";
    }>;
    answers: Record<
      string,
      {
        values: string[];
        labels: string[];
        indices: number[];
        customText?: string;
        note?: string;
        optionNotes?: Record<string, string>;
      }
    >;
    continuation?: {
      strategy: "refine_only" | "resume";
      affectedQuestionIds: string[];
      preservedAnswers: Record<string, {
        values: string[];
        labels: string[];
        indices: number[];
        customText?: string;
        note?: string;
        optionNotes?: Record<string, string>;
      }>;
      questionStates: Record<string, {
        status: "answered" | "needs_clarification" | "unanswered";
      }>;
    };
    elaboration?: {
      instruction: string;
      nextAction: "clarify" | "clarify_then_reask";
      items: Array<
        | {
            target: { kind: "question" };
            question: {
              id: string;
              label: string;
              prompt: string;
              type: "single" | "multi" | "preview";
              options: Array<{
                value: string;
                label: string;
                description?: string;
                preview?: string;
              }>;
            };
            answered: boolean;
            answer?: {
              values: string[];
              labels: string[];
              indices: number[];
              customText?: string;
              note?: string;
              optionNotes?: Record<string, string>;
            };
            note: string;
          }
        | {
            target: { kind: "option"; optionValue: string };
            question: {
              id: string;
              label: string;
              prompt: string;
              type: "single" | "multi" | "preview";
              options: Array<{
                value: string;
                label: string;
                description?: string;
                preview?: string;
              }>;
            };
            option: {
              value: string;
              label: string;
              description?: string;
              preview?: string;
            };
            selected: boolean;
            answered: boolean;
            answer?: {
              values: string[];
              labels: string[];
              indices: number[];
              customText?: string;
              note?: string;
              optionNotes?: Record<string, string>;
            };
            note: string;
          }
      >;
    };
  };
}
```

## Output rules

- `cancelled: true` means the user dismissed the flow, UI was unavailable, or the payload was invalid before UI opened
- invalid payloads return `error.kind === "invalid_input"` with structured `issues` and a transcript-friendly `Invalid ask_user payload:` message
- `mode: "submit"` is normal completion; `mode: "elaborate"` means the user asked the agent to continue with follow-up clarification based on notes
- unanswered questions are omitted from `answers`
- in `mode: "elaborate"`, `answers` contains only committed answers; note-only entries move to `elaboration.items`
- `continuation.strategy === "refine_only"` means the next ask should refine the current flow rather than restart it
- `continuation.preservedAnswers` contains previously committed answers that should be kept as context and not re-asked
- `continuation.affectedQuestionIds` lists the only questions that should be revisited
- `continuation.questionStates` marks each question as `answered`, `needs_clarification`, or `unanswered`
- single-select answers still use arrays
- `indices` are 1-based rendered option positions
- `customText` stores the free-form answer
- on single-select questions, saving free-form text clears selected options for that question
- on multi-select questions, `values` and `labels` include both selected options and `customText` when both are present
- on multi-select questions, selected options keep their original order and `customText` is appended last
- submitting free-form text on a multi-select question stays on the same question tab and marks the custom row selected
- on multi-select questions, toggling an empty custom row opens the free-form editor, while toggling a custom row with saved free-form text selects or deselects it without opening the editor or clearing the text
- saving or clearing free-form text on a multi-select question does not clear other selected options
- `note` stores a question-level note
- `optionNotes` includes only notes for selected options
- question notes may exist without a selected answer
- `elaboration.items` includes all question notes and all option notes, even for unselected options
- every elaboration item includes the full normalized question and option list for that question so referential notes like `above` remain understandable to the agent
- option-targeted elaboration items include the specific noted option plus whether it is currently selected
- question-targeted elaboration items include whether the question already has a committed answer
- `elaboration.instruction` tells the agent to answer the clarification directly first, then re-ask only the affected questions if a choice is still needed
- after clarification, agents should prefer another structured follow-up over plain-text multiple choice when a decision is still unresolved
- once prior answers narrow the branch, agents should bundle the next 2-3 related unresolved questions into one follow-up ask when possible, instead of using a long sequence of single-question asks
- `elaboration` is only present when `mode === "elaborate"`
- elaborate `content` text and transcript rendering describe each note directly using the full question prompt and option label, and include the current committed answer text when available, instead of a generic elaboration banner
- when the user selects `Elaborate` without adding notes, elaborate `content` text and transcript rendering still include the committed answer text so the agent can elaborate on that answer directly

## Supported UX

- tabbed multi-question flow
- single-select, multi-select, and preview questions
- inline free-form answers for all question types
- native pi-style `@` file path autocomplete inside free-form answer and note editors
- question notes via `Shift+N`
- option notes via `n`
- number-key quick selection
- submit/elaborate/cancel review tab
- on the review tab, `Submit` and `Cancel` preview notes only for answered questions
- on the review tab, `Elaborate` preview expands to all question notes and all option notes, including notes on unselected options
- transcript-friendly call and result rendering
- `/answer` command to extract a raw-JSON `AskParams` form from the latest completed assistant message and open the ask UI
- `/answer` extraction may use an internal `freeform: true` option for open-ended questions with no explicit choices; these render as user-input-only questions with the label `Type your answer:`, no numbered option row, and no selection caret; this marker is not part of the public `ask_user` tool contract
- `/answer:again` command to replay the latest `/answer`-extracted form on the current branch
- `/ask:replay` command to replay the latest real `ask_user` form on the current branch
- ask settings list with binary behaviour and notification toggles
- `?` in the ask flow and `/ask-settings` in pi open the same lightweight ask settings overlay
- settings persist immediately when changed: `Auto-submit when answered without notes`, `Confirm dismiss when dirty`, `Double-press review shortcuts`, `Notifications`, and `Show footer hints`
- `Keymaps` is a persisted config section for `cancel`, `dismiss`, `toggle`, `confirm`, `optionNote`, and `questionNote`
- the settings list shows the absolute config file path for changing customizable ask keymaps
- if the flow is already on the review tab, all questions are answered, and no notes exist, enabling auto-submit can complete the current ask flow immediately
- elaborate results are phrased as direct follow-up instructions, for example: `User asked to elaborate on question "Which option would you like to select?" option "Option A" with note "why this one?"`

## Keyboard behavior

Main flow:

- `?`: open ask settings
- inside ask settings, `Esc`, `Ctrl+C`, and `?` close it
- `Tab`, `Shift+Tab`, `Left`, `Right`: move between tabs
- `Up`, `Down`: move between options
- `1..9`: select or toggle the matching option; on the review tab, `1`, `2`, and `3` trigger `Submit`, `Elaborate`, and `Cancel`
- when `Double-press review shortcuts` is enabled, review-tab `1`, `2`, and `3` require the same key twice without a timeout, and the review screen shows an inline hint for the pending action
- the following actions are configurable via persisted `keymaps`: `Enter` by default confirms or submits, `Esc` cancels, `Ctrl+C` dismisses, `Space` toggles, `n` edits the active option note, and `Shift+N` edits the current question note

Editing flow:

- the configurable `confirm` binding submits the current editor input and closes the editor; in note editors this saves the note only and keeps the ask flow open
- the configurable `cancel` binding saves draft and closes the editor
- when `Confirm dismiss when dirty` is enabled, cancelling or dismissing a dirty ask flow requires the same action a second time
- the dirty-dismiss warning stays visible until the user changes tabs in the ask flow
- the configurable `dismiss` binding dismisses the entire flow immediately without saving the current editor draft when no dirty-dismiss confirmation is pending
- `?`: open ask settings when the editor is empty; otherwise enter `?` as text
- inside ask settings, behaviour changes save immediately without explicit save feedback
- when editor has text, arrow keys and `Tab` stay in the editor so the cursor can move while typing
- when editor is empty, `Up`/`Down` move options and `Tab`/`Shift+Tab`/`Left`/`Right` move between tabs without requiring the configurable cancel key first
- navigation resumes only after closing the editor with the configurable `cancel` binding, unless the editor is empty and the navigation keys above are used

## Non-interactive mode

If `ctx.hasUI === false`, the tool returns a `Needs user input` message in `content` and a cancelled result in `details`.

Validation is handled inside the tool so malformed calls produce the same structured error shape as other invalid payloads instead of relying on pre-execution schema failures.

The ask flow subscribes to runtime settings updates while open. In practice, this means changing `Auto-submit when answered without notes`, `Confirm dismiss when dirty`, `Double-press review shortcuts`, `Notifications`, `Show footer hints`, or reloading config-backed keymaps can affect the in-progress ask flow immediately instead of only future asks.

## Notifications

When enabled, pi-ask emits one best-effort external notification per ask session after the ask UI opens and waits for input. The default title is `pi ask`; the message is `Question waiting: <label or prompt>`. Channels run in configured order and failures never fail or cancel the ask flow.

## Slash command replay/extraction

- valid `ask_user` payloads are persisted as branch custom entries before the UI opens, so `/ask:replay` can reopen them after cancel, `/resume`, or `/tree`
- `/answer` scans the current branch for the latest assistant message; if that message did not finish with `stop`, extraction is refused
- `/answer` expects the extractor to return raw JSON only; JSON parse failures are retried according to `answer.extractionRetries`, then reported to the user without opening the ask UI
- `{ "questions": [] }` from extraction means no questions were found and is not treated as an invalid ask payload
- command-flow cancellation closes with a notification and does not send a message to the agent
- submitted or elaborated command-flow results are sent back with user-message semantics
- replay commands scan only `ctx.sessionManager.getBranch()`, ignore sibling/future branch payloads, and revalidate stored payloads before opening the UI

The fallback message includes normalized pending questions and options so the caller can re-ask them manually. `details.questions` still contains normalized question metadata, while `details.answers` stays empty until a user responds.

## Skill alignment (advisory)

The auto-bundled skill profile at `skills/ask-user/SKILL.md` defines agent-side decision-gate guidance for when to call `ask_user`. It is enabled by default when the package is installed, but can be disabled via `pi config`.

It is advisory only. If there is any conflict, contract + tests win.

## Source of truth

Behavior should be verified against:

1. `src/types.ts` and exported state/result helpers
2. `tests/*.test.ts`
3. this contract
