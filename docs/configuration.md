# pi-ask configuration

This file is the source of truth for configuring `@eko24ive/pi-ask`.

When changing pi-ask settings:

1. Edit the config file.
2. Validate keymaps against the rules below.
3. Run `/reload` or restart pi so the new config is picked up.

## Config file path

Default path:

`~/.pi/agent/extensions/eko24ive-pi-ask.json`

## Config shape

```json
{
  "schemaVersion": 1,
  "behaviour": {
    "autoSubmitWhenAnsweredWithoutNotes": false,
    "confirmDismissWhenDirty": false,
    "showFooterHints": true
  },
  "keymaps": {
    "cancel": "esc",
    "dismiss": "ctrl+c",
    "toggle": "space",
    "confirm": "enter",
    "optionNote": "n",
    "questionNote": "shift+n"
  }
}
```

## Behaviour

### `behaviour.autoSubmitWhenAnsweredWithoutNotes`

- type: boolean
- default: `false`
- effect: when enabled, a fully answered ask flow with no notes can auto-submit from the review tab

### `behaviour.confirmDismissWhenDirty`

- type: boolean
- default: `false`
- effect: when enabled, discarding a dirty ask flow requires a second cancel/dismiss action
- the warning stays visible until the user changes tabs in the ask flow
- dirty means there are saved answers/notes or unsaved editor draft text

### `behaviour.showFooterHints`

- type: boolean
- default: `true`
- effect: when disabled, the ask flow hides the footer keymap hints

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
  "schemaVersion": 1,
  "behaviour": {
    "autoSubmitWhenAnsweredWithoutNotes": true,
    "confirmDismissWhenDirty": true,
    "showFooterHints": false
  },
  "keymaps": {
    "cancel": "q",
    "dismiss": "ctrl+c",
    "toggle": "ctrl+t",
    "confirm": "ctrl+k",
    "optionNote": "x",
    "questionNote": "shift+x"
  }
}
```

## Agent editing rule

When editing this config for a user:

- preserve unrelated fields
- keep `schemaVersion` at `1`
- do not assign reserved bindings to configurable actions
- do not create duplicate configurable bindings
- after changing the file, tell the user to run `/reload` or restart pi
