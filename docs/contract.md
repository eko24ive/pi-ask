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
- preview questions require preview text for every option
- non-`preview` questions get an internal `Type your own` option

## Output

```ts
{
  content: [{ type: "text"; text: string }];
  details: {
    title?: string;
    cancelled: boolean;
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
  };
}
```

## Output rules

- `cancelled: true` means the user dismissed the flow, UI was unavailable, or the payload was invalid before UI opened
- unanswered questions are omitted from `answers`
- single-select answers still use arrays
- `indices` are 1-based rendered option positions
- `customText` stores the free-form answer
- on single-select questions, saving free-form text clears selected options for that question
- on multi-select questions, `values` and `labels` include both selected options and `customText` when both are present
- on multi-select questions, selected options keep their original order and `customText` is appended last
- saving or clearing free-form text on a multi-select question does not clear other selected options
- `note` stores a question-level note
- `optionNotes` includes only notes for selected options
- question notes may exist without a selected answer

## Supported UX

- tabbed multi-question flow
- single-select, multi-select, and preview questions
- inline free-form answers for non-preview questions
- pi-style `@` file path autocomplete inside free-form answer and note editors
- question notes via `Shift+N`
- option notes via `n`
- number-key quick selection
- submit/cancel review tab
- transcript-friendly call and result rendering

## Keyboard behavior

Main flow:

- `Tab`, `Shift+Tab`, `Left`, `Right`: move between tabs
- `Up`, `Down`: move between options
- `Enter`: confirm or submit
- `Esc`: cancel the flow
- `Ctrl+C`: dismiss the entire flow immediately, even while editing a note or free-form answer
- `1..9`: select or toggle the matching option
- `Space`: toggle the active option
- `n`: edit the active option note
- `Shift+N`: edit the current question note

Editing flow:

- `Enter`: save and submit the current input
- `Esc`: save draft and close the editor
- `Ctrl+C`: dismiss the entire flow immediately without saving the current editor draft
- arrow keys and `Tab` stay in the editor so the cursor can move while typing
- navigation resumes only after closing the editor with `Esc`

## Non-interactive mode

If `ctx.hasUI === false`, the tool returns a `Needs user input` message in `content` and a cancelled result in `details`.

The fallback message includes normalized pending questions and options so the caller can re-ask them manually. `details.questions` still contains normalized question metadata, while `details.answers` stays empty until a user responds.

## Source of truth

Behavior should be verified against:

1. `src/types.ts` and exported state/result helpers
2. `tests/*.test.ts`
3. this contract
