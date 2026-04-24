# @eko24ive/pi-ask

`@eko24ive/pi-ask` adds an interactive `ask_user` clarification tool.

It lets an agent pause, ask structured questions in a terminal UI, and continue with normalized answers instead of guessing.

https://github.com/user-attachments/assets/a74827fb-6093-412a-895f-69f9514bc4fe

## Install

```bash
pi install npm:@eko24ive/pi-ask
```

You can also install from git:

```bash
pi install git:github.com/eko24ive/pi-ask
```

### Screenshots

| | | |
| --- | --- | --- |
| ![](docs/media/ask-user-single.png) | ![](docs/media/ask-user-multi.png) | ![](docs/media/ask-user-preview.png) |
| ![](docs/media/ask-user-notes.png) | ![](docs/media/ask-user-review.png) | |

## Features

Once installed, this package gives the agent a native way to ask for clarification instead of guessing.

- 🧭 **Multi-question flow** — gather several answers in one pass.
- ✅ **Single + multi select** — support simple and additive choices.
- 🪟 **Preview mode** — show richer options with a dedicated preview pane.
- ✍️ **Custom answers** — users can choose `Type your own` and type inline.
- 📝 **Notes** — add question-level or option-level context without breaking the flow.
- 👀 **Submit screen** — check everything before submitting answers back to the agent.
- ⌨️ **Fast keyboard UX** — number shortcuts, inline selection, notes, and submit navigation.

## Use

After installation, the package registers one tool: `ask_user`.

That is enough for the agent to gain this clarification capability. The extension already injects prompt guidance that encourages the agent to call `ask_user` when requirements are ambiguous or user preference matters, instead of guessing.

You can still add your own agent instruction if you want to further reinforce when and how the tool should be used.

Use `type: "preview"` only when every option includes `preview` text for a dedicated preview pane. Descriptions alone are not enough.

### Optional extra agent instruction

```text
If you need clarification, prefer `ask_user` over guessing.

Ask 1-3 concise questions.
Use short tab labels.
Prefer 2-4 options per question.
Include descriptions for each option.
Use `type: "single"` unless multiple options can genuinely apply.
Use `type: "multi"` only when the user may need to select several answers.
Always include a non-empty `value` for every option.
Use `type: "preview"` only when every option includes non-empty `preview` text for the preview panel.
After answers are returned, continue the task using those answers explicitly.
```

## Tool input

`ask_user` accepts:

```ts
{
  title?: string,
  questions: [
    {
      id: string,
      label?: string,
      prompt: string,
      type?: "single" | "multi" | "preview",
      required?: boolean,
      options: [
        {
          value: string,
          label: string,
          description?: string,
          preview?: string
        }
      ]
    }
  ]
}
```

### Example tool call payload

```json
{
  "title": "Implementation preferences",
  "questions": [
    {
      "id": "style",
      "label": "Style",
      "prompt": "How should I frame the next prompt?",
      "type": "single",
      "options": [
        {
          "value": "minimal",
          "label": "Minimal",
          "description": "A short, direct question with few options."
        },
        {
          "value": "balanced",
          "label": "Balanced",
          "description": "A standard prompt with a bit more context."
        },
        {
          "value": "rich",
          "label": "Rich",
          "description": "A more descriptive prompt with extra detail."
        }
      ]
    },
    {
      "id": "frameworks",
      "label": "Frontend",
      "prompt": "Which frontend frameworks have you used?",
      "type": "multi",
      "options": [
        { "value": "react", "label": "React", "description": "Most popular UI library" },
        { "value": "vue", "label": "Vue", "description": "Progressive framework for building UIs" },
        { "value": "svelte", "label": "Svelte", "description": "Compiler-based approach" }
      ]
    }
  ]
}
```

## Returned result

The returned result now also includes:

```ts
{
  error?: {
    kind: "invalid_input"
    issues: Array<{ path: string; message: string }>
  }
  mode: "submit" | "elaborate"
  continuation?: {
    strategy: "refine_only" | "resume"
    affectedQuestionIds: string[]
    preservedAnswers: Record<string, AskResultAnswer>
    questionStates: Record<string, {
      status: "answered" | "needs_clarification" | "unanswered"
    }>
  }
  elaboration?: {
    instruction: string
    nextAction: "clarify" | "clarify_then_reask"
    items: Array<
      | {
          target: { kind: "question" }
          question: {
            id: string
            label: string
            prompt: string
            type: "single" | "multi" | "preview"
            options: Array<{
              value: string
              label: string
              description?: string
              preview?: string
            }>
          }
          answered: boolean
          answer?: AskResultAnswer
          note: string
        }
      | {
          target: { kind: "option"; optionValue: string }
          question: {
            id: string
            label: string
            prompt: string
            type: "single" | "multi" | "preview"
            options: Array<{
              value: string
              label: string
              description?: string
              preview?: string
            }>
          }
          option: {
            value: string
            label: string
            description?: string
            preview?: string
          }
          selected: boolean
          answered: boolean
          answer?: AskResultAnswer
          note: string
        }
    >
  }
}
```

The returned `details.answers[questionId]` object may include:

```ts
{
  values: string[]
  labels: string[]
  indices: number[]
  customText?: string
  note?: string
  optionNotes?: Record<string, string>
}
```

Behavior details:

- payloads are validated before the UI opens: question ids must be unique, option values must be unique within a question, and required text fields must not be blank
- preview questions require preview text for every option; descriptions alone are not enough, and invalid preview payloads suggest adding preview text or switching to `type: "single"`
- `required` defaults to `false` and remains advisory only
- question-level notes are submitted whenever authored
- option notes can be authored for any active option during the UI flow
- only notes for currently selected options are included in the submitted result
- deselecting an option keeps its note in UI state, so re-selecting it restores the note
- empty note text clears the note
- on single-select questions, saving a free-form answer replaces selected options for that question
- on multi-select questions, saving a free-form answer keeps other selected options intact
- on multi-select questions, submitted `values` and `labels` keep selected options first and append the free-form answer last when both exist
- invalid payloads return `details.error.kind === "invalid_input"` with structured `issues` and a transcript-friendly `Invalid ask_user payload:` message
- unanswered questions are omitted from `details.answers`
- in elaborate mode, `details.answers` contains only committed answers; note-only entries move into `details.elaboration.items`
- `details.continuation.strategy === "refine_only"` means the next ask should refine the current flow instead of restarting it
- `details.continuation.preservedAnswers` contains prior answers that should be carried forward without re-asking
- `details.continuation.affectedQuestionIds` lists the only questions that should be revisited
- `details.continuation.questionStates` marks each question as `answered`, `needs_clarification`, or `unanswered`
- submit review tab now offers `Submit`, `Elaborate`, and `Cancel`
- on the review tab, number hotkeys `1`, `2`, and `3` trigger `Submit`, `Elaborate`, and `Cancel`
- while `Submit` or `Cancel` is highlighted on the review tab, notes are previewed only for questions with selected answers
- while `Elaborate` is highlighted on the review tab, the preview expands to show all question notes and all option notes, including notes on unselected options
- choosing `Elaborate` finishes immediately and returns `mode: "elaborate"`
- `details.elaboration.items` includes all question notes and all option notes, even for unselected options
- every elaboration item carries the full normalized question and option list for that question, so the agent can resolve referential notes like `above` without relying on chat memory alone
- `details.elaboration.instruction` explicitly tells the agent to answer the clarification directly first, then re-ask only the affected questions if needed
- after clarification, agents should prefer another structured follow-up over plain-text multiple choice if a decision is still unresolved
- once prior answers narrow the branch, agents should bundle the next 2-3 related unresolved decisions into one follow-up ask when possible instead of asking a long chain of one-question follow-ups
- elaborate summary/result text now emits direct note-specific lines such as `User asked to elaborate on question "Which option would you like to select?" option "Option A" with note "why this one?"`
- when the free-form option is selected, it becomes an inline input row with the selected-tab background style spanning the full width
- while editing a note or free-form answer, arrow keys and `Tab` stay inside the editor while text is present so the typing cursor can move naturally
- when a note or free-form editor is empty, `Up`/`Down` navigate options and `Tab`/`Shift+Tab`/`Left`/`Right` navigate tabs without closing the editor first
- free-form answer editors support pi-style `@` file path autocomplete for quickly mentioning project files
- `Esc` closes the editor and returns to navigation mode
- `Ctrl+C` dismisses the entire ask flow immediately, even from note/free-form editing, without saving the current draft
- use `n` for the active option note and `Shift+N` for the current question note
- `Space` toggles the active option on single-select questions too, but does not auto-advance

If pi runs without UI, `ask_user` returns a `Needs user input` message plus normalized pending questions in `details.questions` so a caller can re-ask them manually.

## Local development

### Run locally in pi

```bash
pi -e ./src/index.ts
```

### Install dependencies

```bash
pnpm install
```

### Development commands

```bash
pnpm format
pnpm lint
pnpm check
pnpm typecheck
pnpm test
```

### Commit workflow

This repo uses `lefthook`, Commitizen, conventional commitlint, and semantic-release.

Recommended flow:

```bash
pnpm commit
```

## Project layout

- `src/` — TypeScript extension implementation
- `tests/` — behavior-focused tests
- `docs/` — small docs set for contract and architecture
- `docs/media/` — repository-only README media assets

## Documentation

Docs stay intentionally small:

- `docs/README.md` — index
- `docs/contract.md` — external behavior
- `docs/architecture.md` — module boundaries and invariants
