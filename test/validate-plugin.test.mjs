import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRepository } from "../scripts/validate-plugin.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function writeTree(root, files) {
    for (const [path, content] of Object.entries(files)) {
        const target = join(root, path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, typeof content === "string" ? content : JSON.stringify(content, null, 2));
    }
}

function assertHasError(errors, pattern) {
    assert.ok(
        errors.some((error) => pattern.test(error)),
        `expected an error that matches ${pattern}\nactual errors:\n${errors.join("\n")}`,
    );
}

test("this repository passes plugin validation", async () => {
    const result = await validateRepository(repoRoot);
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
});

test("plugin validation reports each kind of problem", async (t) => {
    const root = await mkdtemp(join(tmpdir(), "bearing-validate-"));
    t.after(() => rm(root, { recursive: true, force: true }));

    await writeTree(root, {
        ".github/plugin/marketplace.json": {
            name: "Bad_Market",
            owner: { name: "tester" },
            plugins: [{ name: "demo", source: "./plugins/demo", version: "1.0", description: "Demo plugin." }],
        },
        "plugins/demo/plugin.json": {
            name: "demo",
            version: "2.0.0",
            description: "Demo plugin.",
            agents: "agents/",
            skills: "skills/",
            extensions: "extensions",
        },
        "plugins/demo/agents/helper.agent.md": "---\nname: other\ndescription: 'Too short.'\ninfer: true\n---\n\nBody.\n",
        "plugins/demo/agents/scanner.agent.md": [
            "---",
            "name: scanner",
            "description: 'Scans the repository and saves facts with tools that this plugin does not define.'",
            "tools: ['view', 'search', 'bash', 'grepp', 'bearing_missing_tool']",
            "---",
            "",
            "Body.",
            "",
        ].join("\n"),
        "plugins/demo/skills/my-skill/SKILL.md": [
            "---",
            "name: wrong-name",
            "description: 'Too short'",
            "allowed-tools: shell",
            "---",
            "",
            "Read [the guide](references/missing.md). Dispatch demo:ghost-agent.",
            "",
        ].join("\n"),
        "plugins/demo/extensions/demo/extension.mjs": [
            'import { joinSession } from "@github/copilot-sdk/extension";',
            'console.log("hello");',
            'await joinSession({ tools: [{ name: "bearing_get_workspace", handler: () => "" }] });',
            "",
        ].join("\n"),
        "plugins/demo/extensions/demo/lib/util.mjs": 'export { joinSession } from "@github/copilot-sdk/extension";\r\n',
    });

    const result = await validateRepository(root);
    assert.equal(result.ok, false);
    const { errors } = result;
    assertHasError(errors, /marketplace name "Bad_Market"/);
    assertHasError(errors, /plugins\[0\]\.version "1\.0" must be a semantic version/);
    assertHasError(errors, /plugin\.json: version "2\.0\.0" must equal the marketplace version "1\.0"/);
    assertHasError(errors, /helper\.agent\.md: the infer property is retired/);
    assertHasError(errors, /helper\.agent\.md: name "other" must equal the file name "helper"/);
    assertHasError(errors, /helper\.agent\.md: description length is 10/);
    assertHasError(errors, /helper\.agent\.md: tools must be an explicit, non-empty list/);
    assertHasError(errors, /scanner\.agent\.md: tool "bearing_missing_tool" is not defined/);
    assertHasError(errors, /scanner\.agent\.md: the "search" alias maps to no tool/);
    assertHasError(errors, /scanner\.agent\.md: tool "bash" gives shell access/);
    assertHasError(errors, /scanner\.agent\.md: tool "grepp" is not a known tool name/);
    assertHasError(errors, /SKILL\.md: name "wrong-name" must equal the folder name "my-skill"/);
    assertHasError(errors, /SKILL\.md: description length is 9/);
    assertHasError(errors, /SKILL\.md: allowed-tools must not pre-approve shell access/);
    assertHasError(errors, /SKILL\.md: link "references\/missing\.md" does not exist/);
    assertHasError(errors, /SKILL\.md: agent "demo:ghost-agent" is not defined/);
    assertHasError(errors, /extension\.mjs: do not use console\.log/);
    assertHasError(errors, /extension\.mjs: tool name "bearing_get_workspace" collides with Bearing v1/);
    assertHasError(errors, /lib\/util\.mjs: only extension\.mjs may import @github\/copilot-sdk/);
    assertHasError(errors, /lib\/util\.mjs: use LF line endings/);
});
