export const OTHER_OPTION_VALUE = "__other__";
import { t } from "../i18n.ts";

export const OTHER_OPTION_LABEL = t("ui.other", "Type your own");
export const SUBMIT_CHOICES = [
	t("ui.submit", "Submit"),
	t("ui.elaborate", "Elaborate"),
	t("ui.cancel", "Cancel"),
] as const;
export const NO_PREVIEW_TEXT = t("ui.noPreview", "No preview available");
export const ELABORATION_INSTRUCTION =
	"First answer the user's noted clarification directly and concisely using the provided question and option context. Do not treat these notes as final answers. Then re-ask only the affected questions if a choice is still needed afterward. Do not jump straight to a follow-up question unless the note is already resolved.";
export const CANCELLED_SUMMARY = "User cancelled the ask flow";
export const SUBMITTED_SUMMARY = "User submitted the ask flow";
export const ELABORATED_SUMMARY = "User asked for elaboration based on notes";
export const CANCELLED_RESULT_TEXT = t("result.cancelled", "Cancelled");
export const SUBMITTED_RESULT_TEXT = t("result.submitted", "Submitted");
export const ELABORATED_RESULT_TEXT = t("result.elaborated", "Elaboration requested");
