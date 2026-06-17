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
	submitWideMinWidth: 64,
	submitMinReviewWidth: 24,
} as const;

import { t } from "../i18n.ts";

export const UI_TEXT = {
	questionNoteTitle: t("ui.noteTitle", "Note:"),
	reviewTitle: t("ui.reviewTitle", "Review answers"),
	unanswered: t("ui.unanswered", "→ unanswered"),
	editorPlaceholderInput: t("ui.inputPlaceholder", "Type answer..."),
	editorPlaceholderNote: t("ui.notePlaceholder", "Add a note..."),
} as const;
