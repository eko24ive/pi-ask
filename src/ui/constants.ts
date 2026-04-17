export const UI_DIMENSIONS = {
	boxMinWidth: 10,
	callLabelTruncateWidth: 50,
	editorContentPadding: 5,
	editorIndentedPadding: 7,
	editorMinWidth: 8,
	previewWideMinWidth: 90,
	previewMinRightWidth: 24,
	previewLeftMinWidth: 22,
	previewLeftMaxWidth: 34,
	previewLeftRatio: 0.34,
} as const;

export const UI_TEXT = {
	questionNoteTitle: "Question note",
	reviewTitle: "Review your answers",
	readyToSubmit: "Ready to submit your answers?",
	unanswered: "→ (unanswered)",
	footerInput: " Enter submit · Esc save and close · Tab/←→ save and navigate",
	footerNote: " Enter save · Esc save and close · Tab/←→ save and navigate",
	footerSubmit: " ↑↓ select · Enter confirm · Esc cancel",
	footerMulti:
		" ⇆ tab · ↑↓ select · Space toggle · Enter continue · N option note · Ctrl+N question note · Esc dismiss · 1-9 quick toggle",
	footerDefault:
		" ⇆ tab · ↑↓ select · Enter confirm · N option note · Ctrl+N question note · Esc dismiss",
	hintSave: "{newLineHint} newline · Enter save · Esc save and close",
	hintSubmit: "{newLineHint} newline · Enter submit · Esc save and close",
} as const;
