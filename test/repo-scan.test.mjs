import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseGitHubRemote } from "../plugins/bearing/extensions/bearing/lib/git.mjs";
import { scanRepository } from "../plugins/bearing/extensions/bearing/lib/repo-scan.mjs";

function git(cwd, ...args) {
    execFileSync("git", ["-C", cwd, "-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { stdio: "pipe" });
}

async function writeFiles(root, files) {
    for (const [path, content] of Object.entries(files)) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        await writeFile(join(root, path), content);
    }
}

test("parseGitHubRemote reads https and ssh remotes and rejects other hosts", () => {
    assert.deepEqual(parseGitHubRemote("https://github.com/acme/widget.git"), { owner: "acme", name: "widget" });
    assert.deepEqual(parseGitHubRemote("https://user:token@github.com/acme/widget"), { owner: "acme", name: "widget" });
    assert.deepEqual(parseGitHubRemote("git@github.com:acme/my.repo.git"), { owner: "acme", name: "my.repo" });
    assert.deepEqual(parseGitHubRemote("ssh://git@github.com/acme/widget.git"), { owner: "acme", name: "widget" });
    assert.equal(parseGitHubRemote("https://gitlab.com/acme/widget.git"), null);
    assert.equal(parseGitHubRemote(null), null);
});

test("scanRepository reports identity, size, languages, tree, docs, and hotspots", async (t) => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "bearing-scan-")));
    t.after(() => rm(root, { recursive: true, force: true }));

    git(root, "init", "-q", "-b", "main");
    git(root, "remote", "add", "origin", "https://github.com/Acme/Widget.git");
    await writeFiles(root, {
        "README.md": "# Widget\n",
        "CONTRIBUTING.md": "Be kind.\n",
        "src/index.js": "export const a = 1;\nexport const b = 2;\n",
        "src/core/engine.ts": "export function run() {}\n",
        "test/index.test.js": "// test\n",
        "package-lock.json": "{}\n",
        ".github/workflows/ci.yml": "name: CI\n",
    });
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "first");
    await writeFile(join(root, "src/index.js"), "export const a = 1;\nexport const b = 3;\nexport const c = 4;\n");
    git(root, "commit", "-q", "-am", "second");

    const { repository, scan } = await scanRepository(join(root, "src"));

    assert.equal(repository.guideId, "acme__widget");
    assert.equal(repository.rootPath, root);
    assert.equal(repository.fullName, "Acme/Widget");
    assert.equal(repository.url, "https://github.com/Acme/Widget");
    assert.equal(repository.defaultBranch, "main");
    assert.equal(repository.headCommit, repository.defaultBranchCommit);
    assert.equal(repository.linkRef, "main", "an unpushed HEAD links to the branch name");

    assert.equal(scan.size.trackedFiles, 7);
    assert.equal(scan.size.sourceFiles, 6, "the lockfile is not source");
    assert.equal(scan.size.sizeClass, "small");
    assert.equal(scan.size.lines, 5);
    assert.deepEqual(scan.languages.map((entry) => entry.name).sort(), ["JavaScript", "TypeScript"]);

    const src = scan.tree.find((entry) => entry.path === "src");
    assert.deepEqual(src, { path: "src", type: "dir", files: 2, folders: [{ path: "src/core", files: 1 }] });
    assert.deepEqual(scan.docs.map((doc) => doc.kind), ["readme", "contributing", "ci-workflow"]);
    assert.equal(scan.hotspots.files[0].path, "src/index.js");
    assert.equal(scan.hotspots.files[0].commits, 2);
});

test("scanRepository fails clearly outside a git repository", async (t) => {
    const dir = await mkdtemp(join(tmpdir(), "bearing-nogit-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    await assert.rejects(scanRepository(dir), { code: "not_a_git_repository" });
});
