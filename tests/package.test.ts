import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const skillsDir = path.resolve("skills");
const SKILL_NAME_RE = /^name:\s*(.+)$/m;

function readDeclaredSkillName(skillPath: string): string | undefined {
	const content = readFileSync(skillPath, "utf8");
	const match = content.match(SKILL_NAME_RE);
	return match?.[1]?.trim();
}

test("each bundled skill name matches its folder name", () => {
	const skillFolders = readdirSync(skillsDir, { withFileTypes: true }).filter(
		(entry) => entry.isDirectory()
	);

	assert.ok(skillFolders.length > 0);

	for (const folder of skillFolders) {
		const skillPath = path.join(skillsDir, folder.name, "SKILL.md");
		const declaredName = readDeclaredSkillName(skillPath);

		assert.equal(
			declaredName,
			folder.name,
			`${skillPath} declares name "${declaredName}" but folder is "${folder.name}"`
		);
	}
});
