# pi-ask

This project explores a **pi extension** that brings an `ask` capability into the **pi.dev harness**.

## What this is

The goal is to add a tool or extension layer that lets pi users ask questions through a dedicated `ask` interface, while fitting naturally into the pi.dev agent workflow.

## Why

Different agent harnesses expose question/answer style tools in different ways. This repository will collect research on those implementations and use that knowledge to design a pi extension for pi.dev.

## Contents

- `RESEARCH.md` — notes on how `ask` is implemented in different harnesses
- `FINDINGS.md` — synthesized findings from source research
- `SPEC.md` — implementation spec for a pi-native ask/interview tool
- `src/` — TypeScript extension implementation
- `tests/` — TypeScript tests for core logic/result formatting

## Usage

### Load the extension in pi

Run pi with the extension entrypoint:

```bash
pi -e ./src/index.ts
```

This project is designed for dynamic loading via the `-e` flag.

### Install dependencies

```bash
pnpm install
```

### Run tests

```bash
pnpm test
```

### Biome / typecheck

```bash
pnpm format
pnpm lint
pnpm check
pnpm typecheck
```

### Zed

This repo includes project-local Zed settings at:

- `.zed/settings.json`

They are set up to:

- format TypeScript, JSON, and JSONC files with `pnpm exec biome format --stdin-file-path {buffer_path}`
- format on save
- keep newline / trailing whitespace behavior aligned with the repo settings

Note: some Zed settings such as global extension auto-install and autosave are not valid in project-local `.zed/settings.json`, so they are intentionally not included here.

## Tool

The extension registers a tool named `ask_user`.

Use it when the agent needs structured clarification before proceeding.

### Input shape

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
      allowOther?: boolean,
      required?: boolean, // metadata only; submit is never blocked
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

## Current UX

The current prototype supports:

- tabbed multi-question flow
- single-select questions
- multi-select questions
- preview questions with a dedicated preview pane and no `Type your own` fallback
- fixed `Type your own` fallback option that preserves typed text when dismissed
- number-key quick selection
- final submit/review page
- transcript rendering for call/result rows

## Example agent instruction

You can give the agent an instruction like this to encourage proper `ask_user` usage:

```text
When requirements are ambiguous or user preferences materially affect implementation,
call `ask_user` instead of guessing.

Ask 1-3 concise questions.
Use short tab labels.
Prefer 2-4 options per question.
Include descriptions for each option.
Allow custom input when the fixed choices may be insufficient.
Use `type: "single"` unless multiple options can genuinely apply.
Use `type: "multi"` only when the user may need to select several answers.
After answers are returned, continue the task using those answers explicitly.
```

### Example request to the agent

```text
Before implementing, clarify my preferences with `ask_user` if needed.
For example, ask about framework choice, styling approach, and testing strictness.
Do not guess if those choices would change the implementation.
```

## Status

Prototype implemented in TypeScript and test-covered for core logic.
