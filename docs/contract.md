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
- `label` falls back to `Q1`, `Q2`, ...
- `type` defaults to `single`
- `required` is metadata only; it never blocks submission
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

- `cancelled: true` means the user dismissed the flow or UI was unavailable
- single-select answers still use arrays
- `indices` are 1-based rendered option positions
- `customText` stores the free-form answer
- on multi-select questions, `values` and `labels` include both selected options and `customText` when both are present
- saving or clearing free-form text on a multi-select question does not clear other selected options
- `note` stores a question-level note
- `optionNotes` includes only notes for selected options
- question notes may exist without a selected answer

## Supported UX

- tabbed multi-question flow
- single-select, multi-select, and preview questions
- inline free-form answers for non-preview questions
- question notes via `Ctrl+N`
- option notes via `N`
- number-key quick selection
- submit/cancel review tab
- transcript-friendly call and result rendering

## Keyboard behavior

Main flow:

- `Tab`, `Shift+Tab`, `Left`, `Right`: move between tabs
- `Up`, `Down`: move between options
- `Enter`: confirm or submit
- `Esc`: cancel the flow
- `1..9`: select or toggle the matching option
- `Space`: toggle the active option
- `N`: edit the active option note
- `Ctrl+N`: edit the current question note

Editing flow:

- `Enter`: save and submit the current input
- `Esc`: save draft and close the editor
- arrow keys and `Tab` stay in the editor so the cursor can move while typing
- navigation resumes only after closing the editor with `Esc`

## Non-interactive mode

If `ctx.hasUI === false`, the tool returns an error message in `content` and a cancelled result in `details`.

## Source of truth

Behavior should be verified against:

1. `src/types.ts` and exported state/result helpers
2. `tests/*.test.ts`
3. this contract
