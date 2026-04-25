# @eko24ive/pi-ask

`@eko24ive/pi-ask` is an ask tool that cares about your answers.

It lets an agent pause, ask structured questions in a terminal UI, and continue with normalized answers instead of guessing.

https://github.com/user-attachments/assets/a8503ca9-afcb-4c31-9edc-353b985a0209


## Install

```bash
pi install npm:@eko24ive/pi-ask
```

You can also install from git:

```bash
pi install git:github.com/eko24ive/pi-ask
```

## Features

Once installed, this package gives the agent a native way to ask for clarification instead of guessing.

- 🧭 Familiar ask-style interface: tabbed questions, single/multi select, and preview mode
- ✍️ Inline free-form `Type your own` answers
- 📝 Question-level and option-level notes
- 👀 Review tab with `Submit`, `Elaborate`, and `Cancel`
- 💬 Elaboration flow to capture note-based clarification before final submission
- ⌨️ Fast keyboard-first interaction (also mobile-friendly in remote sessions)

## Feature walkthrough

### Multi-question flow (tabs)
Move across several related questions in one ask flow.

![Multi-question ask_user flow with tab navigation](docs/media/feature-multi-question-tabs.png)

### Single-select question
Pick one option when answers are mutually exclusive.

![Single-select question with one selected option](docs/media/feature-single-select.png)

### Multi-select question
Choose multiple options when several answers apply.

![Multi-select question with multiple selected options](docs/media/feature-multi-select.png)

### Preview mode
Use a dedicated preview pane when options need richer detail.

![Preview question showing a dedicated preview pane](docs/media/feature-preview-pane.png)

### Custom answer (`Type your own`)
Capture free-form input inline without leaving the flow.

![Inline custom answer input for Type your own option](docs/media/feature-custom-answer-input.png)

### Option notes
Attach clarification notes to a specific option (`n`).

![Option note editor with note text for selected option](docs/media/feature-option-note.png)

### Question notes
Add notes at question level for broader context (`Shift+N`).

![Question-level note editor with saved note](docs/media/feature-question-note.png)

### Review tab — Submit
Review all answers before returning them to the agent.

![Review tab with Submit action highlighted](docs/media/feature-review-submit.png)

### Review tab — Elaborate
Ask the agent to elaborate on notes before finalizing choices.

![Review tab with Elaborate action and expanded note preview](docs/media/feature-review-elaborate.png)

## Use

After installation, the package registers one tool: `ask_user`.

That is enough for the agent to gain this clarification capability. The extension already injects prompt guidance that encourages the agent to call `ask_user` when requirements are ambiguous or user preference matters, instead of guessing.

This package also includes an auto-bundled skill profile at `skills/ask-user/SKILL.md` (`ask-user`) for stricter decision-gate behavior in high-stakes or ambiguous boundaries. It is enabled by default when the package is installed, but can be disabled via `pi config`.

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
- while `Submit` or `Cancel` is highlighted on the review tab, notes are previewed only for questions with selected answers
- while `Elaborate` is highlighted on the review tab, the preview expands to show all question notes and all option notes, including notes on unselected options
- choosing `Elaborate` finishes immediately and returns `mode: "elaborate"`
- `details.elaboration.items` includes all question notes and all option notes, even for unselected options
- every elaboration item carries the full normalized question and option list for that question, so the agent can resolve referential notes like `above` without relying on chat memory alone
- `details.elaboration.instruction` explicitly tells the agent to answer the clarification directly first, then re-ask only the affected questions if needed
- after clarification, agents should prefer another structured follow-up over plain-text multiple choice if a decision is still unresolved
- once prior answers narrow the branch, agents should bundle the next 2-3 related unresolved decisions into one follow-up ask when possible instead of asking a long chain of one-question follow-ups
- elaborate summary/result text now emits direct note-specific lines such as `User asked to elaborate on question "Which option would you like to select?" option "Option A" with note "why this one?"`
- free-form answer editors support pi-style `@` file path autocomplete for quickly mentioning project files
- keyboard interactions for navigation, editing, review actions, and cancellation are listed in [Key bindings](#key-bindings) below

---

## Key bindings

| Key                         | Context                                 | Effect                                      |
|-----------------------------|-----------------------------------------|---------------------------------------------|
| `Tab` `Shift+Tab`           | Main flow                               | Switch tabs                                 |
| `←` `→`                     | Main flow                               | Switch tabs                                 |
| `↑` `↓`                     | Main flow                               | Move cursor                                 |
| `1..9`                      | Options list                            | Select or toggle matching option            |
| `Space`                     | Single- or multi-select option          | Toggle selection                            |
| `Enter`                     | Single-select option                    | Confirm and continue                        |
| `Enter`                     | Multi-select option                     | Continue                                    |
| `n`                         | Active option                           | Edit option note                            |
| `Shift+N`                   | Current question                        | Edit question note                          |
| `1` `2` `3`                 | Review tab                              | Trigger `Submit` / `Elaborate` / `Cancel`   |
| `↑` `↓`                     | Review tab                              | Change highlighted review action            |
| `Enter`                     | Review tab                              | Confirm highlighted review action           |
| `Enter`                     | Free-form answer editor                 | Save and submit current input               |
| `Enter`                     | Note editor                             | Save current note                           |
| `Esc`                       | Free-form or note editor                | Save draft and close editor                 |
| `Ctrl+C`                    | Anywhere                                | Dismiss entire ask flow immediately         |
| `↑` `↓`                     | Empty editor                            | Move options without closing editor         |
| `Tab` `Shift+Tab` / `←` `→` | Empty editor                            | Switch tabs without closing editor          |
| Arrow keys / `Tab`          | Non-empty editor                        | Stay in editor for cursor movement          |

---

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
