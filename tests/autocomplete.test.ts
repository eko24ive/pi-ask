import assert from "node:assert/strict";
import test from "node:test";
import { createAskAutocompleteProvider } from "../src/ui/autocomplete.ts";

test("ask autocomplete explicitly triggers on file mention marker", () => {
	const provider = createAskAutocompleteProvider(process.cwd());

	assert.deepEqual(provider.triggerCharacters, ["@"]);
});
