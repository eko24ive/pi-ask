# pi-ask configuration

This file is the source of truth for configuring `@eko24ive/pi-ask`.

When changing pi-ask settings:

1. Edit the config file.
2. Validate keymaps against the rules below.
3. Run `/reload` or restart pi so the new config is picked up.

## Config file path

Default path:

`~/.pi/agent/extensions/eko24ive-pi-ask.json`

If the file does not exist yet, pi-ask creates it with the current default settings the first time the ask flow is used.

Older pi-ask versions wrote this file at `~/.pi/agent/eko24ive-pi-ask.json`. If that legacy file exists and the extensions config does not, pi-ask moves it into `~/.pi/agent/extensions/` on load. If both files exist, pi-ask uses the extensions config and leaves the legacy root file untouched.

## Config versions and migrations

`schemaVersion` identifies the persisted config shape. pi-ask migrates older supported schema versions forward before validation, then rewrites the file in the current shape. Migrations preserve existing user-provided values and add new fields from defaults when needed.

Unsupported future versions or invalid files are backed up and defaults are loaded.

## Config shape

```json
{
  "schemaVersion": 3,
  "answer": {
    "extractionModels": [
      { "provider": "openai-codex", "id": "gpt-5.4-mini" },
      { "provider": "github-copilot", "id": "gpt-5.4-mini" },
      { "provider": "anthropic", "id": "claude-haiku-4-5" }
    ],
    "extractionTimeoutMs": 30000,
    "extractionRetries": 1
  },
  "behaviour": {
    "autoSubmitWhenAnsweredWithoutNotes": false,
    "confirmDismissWhenDirty": true,
    "doublePressReviewShortcuts": true,
    "showFooterHints": true
  },
  "keymaps": {
    "cancel": "esc",
    "dismiss": "ctrl+c",
    "toggle": "space",
    "confirm": "enter",
    "optionNote": "n",
    "questionNote": "shift+n"
  },
  "notifications": {
    "enabled": true,
    "channels": ["bell"]
  }
}
```

## Answer extraction

These settings affect only the `/answer` command. Normal `ask_user` tool calls do not use an extraction model.

### `answer.extractionModels`

- type: array of `{ "provider": string, "id": string }`
- default: `openai-codex/gpt-5.4-mini`, `github-copilot/gpt-5.4-mini`, then `anthropic/claude-haiku-4-5`
- effect: `/answer` tries configured models in order and uses the first model with available auth
- fallback: if no configured model is usable, `/answer` tries the current chat model after validating its auth

### `answer.extractionTimeoutMs`

- type: positive number
- default: `30000`
- effect: per-attempt extraction timeout in milliseconds

### `answer.extractionRetries`

- type: integer from `0` to `3`
- default: `1`
- effect: number of retry attempts after raw JSON parsing fails; retries include the parse error and previous response as feedback

## Behaviour

### `behaviour.autoSubmitWhenAnsweredWithoutNotes`

- type: boolean
- default: `false`
- effect: when enabled, a fully answered ask flow with no notes can auto-submit from the review tab

### `behaviour.confirmDismissWhenDirty`

- type: boolean
- default: `true`
- effect: when enabled, discarding a dirty ask flow requires a second cancel/dismiss action
- the warning stays visible until the user changes tabs in the ask flow
- dirty means there are saved answers/notes or unsaved editor draft text

### `behaviour.doublePressReviewShortcuts`

- type: boolean
- default: `true`
- effect: when enabled, review-tab number shortcuts (`1`, `2`, `3`) only trigger after pressing the same key twice
- the review screen shows an inline hint and keeps the pending shortcut armed until another review shortcut is pressed or the user leaves the tab

### `behaviour.showFooterHints`

- type: boolean
- default: `true`
- effect: when disabled, the ask flow hides the footer keymap hints

## Notifications

Notifications are best-effort external alerts emitted once per ask session, when the ask UI opens and is waiting for input.

### `notifications.enabled`

- type: boolean
- default: `true`
- effect: enables or disables external ask notifications
- settings UI: this is the only notification field toggled by `/ask-settings` or `?` in the ask flow

### `notifications.channels`

- type: array
- default: `["bell"]`
- supported channels:
  - `"bell"` writes BEL (`\u0007`)
  - `"osc9"` writes an OSC 9 terminal notification
  - `"osc777"` writes an OSC 777 title/body notification
  - `{ "type": "command", "command": string }` runs a shell command
- effect: channels run in order; failures are ignored and never fail the ask flow
- invalid channels are skipped; if none are valid, pi-ask falls back to `["bell"]`

Notification text:

```txt
Question waiting: <label or prompt>
```

Command channels receive these environment variables:

```sh
ASK_NOTIFY_EVENT=question.waiting
ASK_NOTIFY_TITLE="pi ask"
ASK_NOTIFY_MESSAGE="Question waiting: <label or prompt>"
```

cmux example:

```json
{
  "type": "command",
  "command": "cmux notify --title \"$ASK_NOTIFY_TITLE\" --body \"$ASK_NOTIFY_MESSAGE\""
}
```

## Keymaps

`keymaps` must contain all 6 configurable actions if present.

### Configurable actions

- `cancel`
- `dismiss`
- `toggle`
- `confirm`
- `optionNote`
- `questionNote`

### Defaults

- `cancel: "esc"`
- `dismiss: "ctrl+c"`
- `toggle: "space"`
- `confirm: "enter"`
- `optionNote: "n"`
- `questionNote: "shift+n"`

### Allowed bindings

Each configurable action accepts any single `pi-tui` key id string, as long as it is:

- supported by `pi-tui`
- not reserved
- not duplicated across configurable actions

Examples of valid bindings:

- `esc`
- `ctrl+c`
- `space`
- `enter`
- `n`
- `shift+n`
- `alt+f7`
- `ctrl+[`
- `ctrl+shift+p`
- `super+k`

### Accepted alias normalization

Common aliases are normalized to canonical `pi-tui`-style strings.

Examples:

- `escape` -> `esc`
- `return` -> `enter`
- `control+c` -> `ctrl+c`
- `Shift+N` -> `shift+n`
- `pageup` -> `pageUp`
- `pagedown` -> `pageDown`

### Reserved bindings

These bindings are fixed and cannot be used by configurable actions:

- `?`
- `tab`
- `shift+tab`
- `left`
- `right`
- `up`
- `down`
- `1`
- `2`
- `3`
- `4`
- `5`
- `6`
- `7`
- `8`
- `9`

### Fixed bindings

These are intentionally not configurable:

- `?` opens ask settings
- `tab`, `shift+tab`, `left`, `right` move between tabs
- `up`, `down` move between options/actions
- `1..9` triggers option/review shortcuts
- when `behaviour.doublePressReviewShortcuts` is enabled, review-tab shortcuts `1`, `2`, and `3` require the same key twice
- `@` remains file-reference affordance in editors

## Invalid keymaps behavior

If configured keymaps are invalid:

- valid `behaviour` settings still load
- invalid `keymaps` fall back to default keymaps for the current session
- ask remains usable
- a warning notice is shown
- after fixing the file, run `/reload` or restart pi

Invalid keymaps include:

- missing one of the 6 required actions
- unsupported key syntax
- duplicate bindings across configurable actions
- use of reserved bindings

## Example custom config

```json
{
  "schemaVersion": 3,
  "answer": {
    "extractionRetries": 1,
    "extractionTimeoutMs": 30000,
    "extractionModels": [
      { "provider": "openai-codex", "id": "gpt-5.4-mini" }
    ]
  },
  "behaviour": {
    "autoSubmitWhenAnsweredWithoutNotes": true,
    "confirmDismissWhenDirty": true,
    "doublePressReviewShortcuts": true,
    "showFooterHints": false
  },
  "keymaps": {
    "cancel": "q",
    "dismiss": "ctrl+c",
    "toggle": "ctrl+t",
    "confirm": "ctrl+k",
    "optionNote": "x",
    "questionNote": "shift+x"
  },
  "notifications": {
    "enabled": true,
    "channels": [
      {
        "type": "command",
        "command": "cmux notify --title \"$ASK_NOTIFY_TITLE\" --body \"$ASK_NOTIFY_MESSAGE\""
      }
    ]
  }
}
```

## Agent editing rule

When editing this config for a user:

- preserve unrelated fields
- keep `schemaVersion` at `3`
- preserve `answer.extractionModels` as explicit provider/id pairs
- keep `answer.extractionRetries` between `0` and `3`
- do not assign reserved bindings to configurable actions
- do not create duplicate configurable bindings
- preserve existing `notifications.channels` unless the user asks to change notification targets
- only toggle `notifications.enabled` unless the user asks to configure channels
- use a `cmux notify` command channel when the user asks for cmux notifications
- after changing the file, tell the user to run `/reload` or restart pi
