import { test } from "node:test";
import assert from "node:assert/strict";
import { FrontmatterError, parseFrontmatter, parseYamlSubset } from "../scripts/lib/frontmatter.mjs";

test("parses scalars, quoted strings, and inline lists", () => {
    const data = parseYamlSubset(
        [
            "name: repo-cartographer",
            "description: 'It''s a map: of \"where is what\".'",
            'title: "Line\\nbreak"',
            "tools: ['view', \"grep\", glob]",
            "user-invocable: false",
            "count: 3",
            "empty:",
            "note: plain text # with a comment",
        ].join("\n"),
    );
    assert.deepEqual(data, {
        name: "repo-cartographer",
        description: "It's a map: of \"where is what\".",
        title: "Line\nbreak",
        tools: ["view", "grep", "glob"],
        "user-invocable": false,
        count: 3,
        empty: null,
        note: "plain text",
    });
});

test("parses block lists, nested maps, and block scalars", () => {
    const data = parseYamlSubset(
        [
            "tools:",
            "  - view",
            "  - 'grep'",
            "metadata:",
            "  version: \"1.0\"",
            "  owner: bearing",
            "summary: |",
            "  First line.",
            "  Second line.",
            "folded: >",
            "  One",
            "  sentence.",
        ].join("\n"),
    );
    assert.deepEqual(data.tools, ["view", "grep"]);
    assert.deepEqual(data.metadata, { version: "1.0", owner: "bearing" });
    assert.equal(data.summary, "First line.\nSecond line.");
    assert.equal(data.folded, "One sentence.");
});

test("splits the frontmatter from the body", () => {
    const parsed = parseFrontmatter("---\nname: demo\n---\n\n# Title\nBody text.\n");
    assert.deepEqual(parsed.data, { name: "demo" });
    assert.equal(parsed.body, "\n# Title\nBody text.\n");
    assert.equal(parseFrontmatter("# No frontmatter\n"), null);
});

test("rejects malformed frontmatter", () => {
    assert.throws(() => parseFrontmatter("---\nname: demo\n"), FrontmatterError);
    assert.throws(() => parseYamlSubset("name: 'unclosed"), FrontmatterError);
    assert.throws(() => parseYamlSubset("tools: ['a', 'b'"), FrontmatterError);
    assert.throws(() => parseYamlSubset("name: a\nname: b"), FrontmatterError);
    assert.throws(() => parseYamlSubset("  indented: value"), FrontmatterError);
});
