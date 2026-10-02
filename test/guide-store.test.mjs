import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGuide, guideEvents, loadGuide, loadProgress, setStepDone, updateGuide } from "../plugins/bearing/extensions/bearing/lib/guide-store.mjs";
import { guideDir } from "../plugins/bearing/extensions/bearing/lib/paths.mjs";
import { applySection, guideOutline, prepareSection, recordPullRequestFacts } from "../plugins/bearing/extensions/bearing/lib/sections.mjs";

const home = await mkdtemp(join(tmpdir(), "bearing-home-"));
process.env.COPILOT_HOME = home;

const repoRoot = await mkdtemp(join(tmpdir(), "bearing-repo-"));
await mkdir(join(repoRoot, "lib"), { recursive: true });
await writeFile(join(repoRoot, "lib/index.js"), "line 1\nline 2\nline 3\n");
await writeFile(join(repoRoot, "README.md"), "# Demo\n");

test.after(async () => {
    await rm(home, { recursive: true, force: true });
    await rm(repoRoot, { recursive: true, force: true });
});

function newGuide(guideId) {
    return createGuide({ repository: { guideId, rootPath: repoRoot, fullName: "acme/demo" }, scan: { size: { trackedFiles: 2 } } });
}

test("a new guide has pending sections and is stored under COPILOT_HOME", async () => {
    await newGuide("acme__demo");
    assert.equal(guideDir("acme__demo"), join(home, "extensions/bearing/artifacts/guides/acme__demo"));
    const stored = JSON.parse(await readFile(join(guideDir("acme__demo"), "guide.json"), "utf8"));
    assert.equal(stored.sections.map.status, "pending");
    assert.deepEqual(await loadProgress("acme__demo"), { done: {} });
    assert.equal(await loadGuide("acme__none"), null);
});

test("prepareSection keeps good references and removes bad ones with warnings", async () => {
    const { data, warnings } = await prepareSection(
        "map",
        {
            areas: [
                { path: "lib/", purpose: "Library code", refs: [{ path: "lib/index.js", startLine: 2, endLine: 3 }] },
                { path: "src/missing", purpose: "Invented" },
                { path: "../etc/passwd", purpose: "Outside" },
                { path: "README.md", purpose: "Docs", refs: [{ path: "README.md", startLine: 5, endLine: 9 }] },
            ],
            lookups: [{ question: "Where is the entry point?", answer: "lib/index.js", refs: [{ path: "nope.js" }] }],
        },
        repoRoot,
    );
    assert.deepEqual(data.areas.map((area) => [area.id, area.path]), [["lib", "lib"], ["readme-md", "README.md"]]);
    assert.deepEqual(data.areas[0].refs, [{ path: "lib/index.js", startLine: 2, endLine: 3 }]);
    assert.deepEqual(data.areas[1].refs, [{ path: "README.md" }], "invalid line numbers are removed");
    assert.deepEqual(data.lookups[0].refs, []);
    assert.equal(data.lookups[0].id, "where-is-the-entry-point");
    assert.equal(warnings.length, 4);
});

test("prepareSection rejects missing required fields and trims long content", async () => {
    await assert.rejects(prepareSection("overview", { stack: [] }, repoRoot), { code: "section_invalid" });
    await assert.rejects(prepareSection("pull-request", { number: "12", title: "x", summary: "y", walkthrough: [{}] }, repoRoot), {
        code: "section_invalid",
    });
    const { data, warnings } = await prepareSection(
        "conventions",
        {
            conventions: Array.from({ length: 25 }, (_, i) => ({
                title: `Rule ${i % 3}`,
                rule: "x".repeat(2500),
                example: { snippet: Array.from({ length: 40 }, (_, line) => `line ${line}`).join("\n") },
            })),
        },
        repoRoot,
    );
    assert.equal(data.conventions.length, 20);
    assert.equal(data.conventions[0].rule.length, 2000);
    assert.equal(data.conventions[0].example.snippet.split("\n").length, 30);
    assert.deepEqual(data.conventions.slice(0, 4).map((item) => item.id), ["rule-0", "rule-1", "rule-2", "rule-0-2"]);
    assert.ok(warnings.some((warning) => warning.startsWith("conventions: kept the first 20")));
});

test("pull request facts come first, and GitHub facts replace the agent's copies", async () => {
    await newGuide("acme__prs");
    const facts = (number, mergedAt) => ({ number, title: `Real title ${number}`, url: `https://github.com/acme/demo/pull/${number}`, author: "dev", mergedAt });
    await updateGuide("acme__prs", "changes", (guide) =>
        recordPullRequestFacts(guide, [facts(1, "2026-01-01T00:00:00Z"), facts(3, "2026-03-01T00:00:00Z")], { replace: true }),
    );
    let changes = (await loadGuide("acme__prs")).sections.changes;
    assert.deepEqual(changes.pullRequests.map((pr) => [pr.number, pr.status]), [[3, "pending"], [1, "pending"]]);

    const narrative = { number: 1, title: "Invented title", url: "https://example.com", summary: "s", walkthrough: [{ title: "t" }] };
    const { data } = await prepareSection("pull-request", narrative, repoRoot);
    await updateGuide("acme__prs", "pull-request", (guide) => applySection(guide, "pull-request", data));
    await updateGuide("acme__prs", "changes", (guide) => recordPullRequestFacts(guide, [{ number: 1, files: [{ path: "a.js" }] }]));
    await updateGuide("acme__prs", "changes", (guide) => applySection(guide, "changes", { source: "gh" }));

    changes = (await loadGuide("acme__prs")).sections.changes;
    const first = changes.pullRequests.find((pr) => pr.number === 1);
    assert.equal(first.title, "Real title 1");
    assert.equal(first.url, "https://github.com/acme/demo/pull/1");
    assert.equal(first.status, "ready");
    assert.equal(first.summary, "s");
    assert.deepEqual(first.files, [{ path: "a.js" }]);
    assert.equal(changes.status, "ready");
    assert.equal(changes.source, "gh");
});

test("parallel saves keep every section, emit events, and show in the outline", async () => {
    await newGuide("acme__parallel");
    const events = [];
    const listener = (event) => events.push(event.section);
    guideEvents.on("change", listener);
    await Promise.all(
        ["overview", "architecture", "workflow"].map(async (section) => {
            const data = { summary: `About ${section}`, commands: [{ command: "npm test" }] };
            const prepared = await prepareSection(section, data, repoRoot);
            await updateGuide("acme__parallel", section, (guide) => applySection(guide, section, prepared.data));
        }),
    );
    await updateGuide("acme__parallel", "journey", (guide) =>
        applySection(guide, "journey", null, { status: "unavailable", reason: "The agent failed." }),
    );
    guideEvents.off("change", listener);

    const outline = guideOutline(await loadGuide("acme__parallel"));
    assert.equal(outline.sections.overview.status, "ready");
    assert.equal(outline.sections.architecture.status, "ready");
    assert.deepEqual(outline.sections.workflow.commands, [{ id: "npm-test", command: "npm test" }]);
    assert.deepEqual(outline.sections.journey, { status: "unavailable", reason: "The agent failed.", firstSteps: [] });
    assert.deepEqual(events.sort(), ["architecture", "journey", "overview", "workflow"]);
});

test("checklist progress is saved", async () => {
    await newGuide("acme__progress");
    await setStepDone("acme__progress", "read-readme", true);
    await setStepDone("acme__progress", "run-tests", true);
    await setStepDone("acme__progress", "run-tests", false);
    assert.deepEqual(Object.keys((await loadProgress("acme__progress")).done), ["read-readme"]);
});
