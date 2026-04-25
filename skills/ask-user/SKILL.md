---
name: ask-user
description: "Use ask_user as a decision gate before high-stakes or ambiguous implementation choices."
metadata:
  short-description: Decision gate for ambiguity and high-stakes choices
---

# Ask User decision gate

Use this skill to force explicit user alignment before consequential decisions.

This skill is for decision control, not general chat.

## Trigger

Classify the next step as one of:

- `high_stakes`
- `ambiguous`
- `both`
- `clear`

Use `ask_user` when the next step is ambiguous, preference-sensitive, or high-stakes and the user has not already made the decision explicitly.

### Treat as `high_stakes` when the next step changes:

- architecture, schema, API contract, deployment, or security posture
- production-facing behavior in a costly-to-undo way
- large refactors, migrations, or destructive edits

### Treat as `ambiguous` when:

- requirements or success criteria are missing/conflicting
- multiple valid options exist and the trade-off is preference-sensitive
- you would otherwise make a material assumption

## Handshake (required)

1. Gather evidence first from code/docs/tools.
2. Summarize neutral context (current state, constraints, trade-offs, recommendation).
3. Ask one focused `ask_user` decision question.
4. Restate the user decision and proceed explicitly with it.
5. Re-open only for materially new ambiguity.

## Question budget and escalation

- Max 1 `ask_user` call per decision boundary in normal cases.
- Max 2 calls for the same boundary if first answer is unclear/cancelled.
- Never re-ask the same trade-off without new evidence.

Attempt 2 (only if needed) must be narrower and include:

- `Proceed with recommended option`
- `Choose another option`
- `Stop for now`

After attempt 2:

- for `high_stakes` or `both`: stop as blocked until explicit decision
- for `ambiguous` only: if user delegates ("your call"), proceed with the most reversible default and state assumptions

## ask_user payload quality

- Ask one concrete decision at a time.
- Prefer 2-4 clear options (single-select by default).
- Use `multi` only when selections are truly independent.
- Keep option labels short and outcome-oriented.
- Include trade-off descriptions when non-obvious.
- Prefer non-`preview` questions when a free-form answer may be useful, since those include an internal `Type your own` option.

## Guardrails

- Do not ask before reading available context.
- Do not use for trivial formatting/style micro-decisions.
- Do not continue implementation after unclear high-stakes answers.

## Conflict rule

If this skill conflicts with implementation behavior or tests, the project contract wins:

1. `docs/contract.md`
2. `tests/*.test.ts`
3. this skill
