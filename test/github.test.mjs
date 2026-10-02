import { test } from "node:test";
import assert from "node:assert/strict";
import { isBot, trimDiff } from "../plugins/bearing/extensions/bearing/lib/github.mjs";

test("isBot detects bot authors", () => {
    assert.equal(isBot({ login: "app/dependabot", is_bot: true }), true);
    assert.equal(isBot({ login: "renovate[bot]" }), true);
    assert.equal(isBot({ login: "github-actions" }), true);
    assert.equal(isBot({ login: "some-app", type: "Bot" }), true);
    assert.equal(isBot({ login: "octocat", is_bot: false }), false);
    assert.equal(isBot(null), false);
});

function fileDiff(path, lines) {
    return [`diff --git a/${path} b/${path}`, "index 1..2 100644", `--- a/${path}`, `+++ b/${path}`, "@@ -1 +1 @@", ...Array.from({ length: lines }, (_, i) => `+line ${i}`)].join("\n");
}

test("trimDiff leaves out lockfiles and binaries and limits the size", () => {
    const diff = [
        fileDiff("lib/index.js", 10),
        fileDiff("package-lock.json", 50),
        "diff --git a/logo.png b/logo.png\nBinary files a/logo.png and b/logo.png differ",
        fileDiff("test/big.test.js", 300),
        fileDiff("README.md", 5),
    ].join("\n");

    const { text, files } = trimDiff(diff, { maxLinesPerFile: 100, maxLines: 120 });
    assert.deepEqual(files, [
        { path: "lib/index.js", shown: "yes" },
        { path: "package-lock.json", shown: "no", reason: "lockfile or generated file" },
        { path: "logo.png", shown: "no", reason: "binary file" },
        { path: "test/big.test.js", shown: "partly" },
        { path: "README.md", shown: "no", reason: "diff size limit" },
    ]);
    assert.ok(text.includes("+line 9"));
    assert.ok(!text.includes("package-lock.json"));
    assert.ok(text.includes("more diff lines for test/big.test.js are not shown"));
});
