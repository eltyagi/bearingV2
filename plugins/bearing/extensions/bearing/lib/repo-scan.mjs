// Repository scan: only the facts that the canvas needs and that the agents
// cannot get easily. Identity, size, languages, top-level tree, key docs, and
// hotspots. The agents find commands, conventions, and architecture.

import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { git, listTrackedFiles, readRepository } from "./git.mjs";
import { guideIdFor } from "./paths.mjs";

export const SMALL_REPOSITORY_LIMIT = 2000;
const MAX_LINE_COUNT_BYTES = 512 * 1024;
const MAX_TOP_LEVEL = 100;
const RECENT_COMMITS = 15;

const LANGUAGES = {
    js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", jsx: "JavaScript",
    ts: "TypeScript", tsx: "TypeScript", mts: "TypeScript", cts: "TypeScript",
    py: "Python", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", scala: "Scala",
    rb: "Ruby", php: "PHP", cs: "C#", fs: "F#", swift: "Swift", m: "Objective-C",
    c: "C", h: "C", cc: "C++", cpp: "C++", hpp: "C++", dart: "Dart", ex: "Elixir", exs: "Elixir",
    lua: "Lua", r: "R", jl: "Julia", pl: "Perl", zig: "Zig", hs: "Haskell", clj: "Clojure",
    sh: "Shell", bash: "Shell", zsh: "Shell", ps1: "PowerShell",
    html: "HTML", css: "CSS", scss: "SCSS", less: "Less", vue: "Vue", svelte: "Svelte", astro: "Astro",
    sql: "SQL", graphql: "GraphQL", proto: "Protocol Buffers", tf: "HCL",
};

// Folders and files that do not describe the source code.
const GENERATED = /(?:^|\/)(?:node_modules|vendor|third_party|dist|build|out|coverage|\.next|__pycache__|\.venv|venv|target)\//;
const LOCKFILE = /(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Gemfile\.lock|composer\.lock|go\.sum)$|\.min\.(?:js|css)$|\.map$/;

const DOCS = [
    [/^README(?:\.\w+)?$/i, "readme"],
    [/^(?:\.github\/|docs\/)?CONTRIBUTING(?:\.\w+)?$/i, "contributing"],
    [/^(?:\.github\/)?copilot-instructions\.md$|^\.github\/instructions\/.+\.md$|^(?:AGENTS|CLAUDE)\.md$/, "agent-instructions"],
    [/^(?:\.github\/|docs\/)?CODE_OF_CONDUCT(?:\.\w+)?$/i, "code-of-conduct"],
    [/^(?:\.github\/|docs\/)?SECURITY(?:\.\w+)?$/i, "security"],
    [/^(?:\.github\/|docs\/)?CODEOWNERS$/, "codeowners"],
    [/^(?:CHANGELOG|HISTORY|CHANGES)(?:\.\w+)?$/i, "changelog"],
    [/^(?:LICEN[CS]E|COPYING)(?:\.\w+)?$/i, "license"],
    [/^(?:\.github\/)?pull_request_template\.md$|^\.github\/PULL_REQUEST_TEMPLATE\//i, "pr-template"],
    [/^\.github\/workflows\/[^/]+\.ya?ml$/, "ci-workflow"],
    [/(?:^|\/)(?:adrs?|decisions)\/.+\.md$/i, "decision-record"],
    [/^docs?\/.+\.(?:md|mdx|rst)$/i, "guide"],
];

function isSource(path) {
    return !GENERATED.test(path) && !LOCKFILE.test(path);
}

export function languageOf(path) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (name === "Dockerfile" || name.startsWith("Dockerfile.")) return "Dockerfile";
    if (name === "Makefile") return "Makefile";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? LANGUAGES[name.slice(dot + 1).toLowerCase()] ?? null : null;
}

function countLines(buffer) {
    if (buffer.length === 0 || buffer.subarray(0, 8000).includes(0)) return 0;
    let lines = 0;
    for (const byte of buffer) if (byte === 10) lines += 1;
    return buffer[buffer.length - 1] === 10 ? lines : lines + 1;
}

async function languageStats(root, files, withLines) {
    const totals = new Map();
    let lines = 0;
    for (const path of files) {
        const language = languageOf(path);
        if (!language) continue;
        let size = 0;
        let fileLines = 0;
        try {
            const absolute = join(root, path);
            // lstat: a tracked symlink to a device or a FIFO must not be read.
            const info = await lstat(absolute);
            if (!info.isFile()) continue;
            size = info.size;
            if (withLines && size <= MAX_LINE_COUNT_BYTES) fileLines = countLines(await readFile(absolute));
        } catch {
            continue;
        }
        const entry = totals.get(language) ?? { name: language, files: 0, bytes: 0 };
        entry.files += 1;
        entry.bytes += size;
        totals.set(language, entry);
        lines += fileLines;
    }
    const all = [...totals.values()].sort((a, b) => b.bytes - a.bytes);
    const totalBytes = all.reduce((sum, entry) => sum + entry.bytes, 0) || 1;
    const top = all.slice(0, 6);
    const rest = all.slice(6);
    if (rest.length) {
        top.push({ name: "Other", files: rest.reduce((s, e) => s + e.files, 0), bytes: rest.reduce((s, e) => s + e.bytes, 0) });
    }
    return {
        languages: top.map((entry) => ({ ...entry, percent: Math.round((entry.bytes / totalBytes) * 1000) / 10 })),
        lines: withLines ? lines : null,
    };
}

// Top-level entries with file counts, and the largest subfolders of each folder.
// Returns at most MAX_TOP_LEVEL entries and the number that were left out.
function topLevelTree(files) {
    const entries = new Map();
    for (const path of files) {
        const [first, second, ...rest] = path.split("/");
        if (second === undefined) {
            entries.set(first, { path: first, type: "file" });
            continue;
        }
        const dir = entries.get(first) ?? { path: first, type: "dir", files: 0, children: new Map() };
        dir.files += 1;
        if (rest.length) dir.children.set(second, (dir.children.get(second) ?? 0) + 1);
        entries.set(first, dir);
    }
    const sorted = [...entries.values()].sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === "dir" ? -1 : 1));
    return {
        omitted: Math.max(0, sorted.length - MAX_TOP_LEVEL),
        entries: sorted.slice(0, MAX_TOP_LEVEL).map((entry) =>
            entry.type === "file"
                ? entry
                : {
                    path: entry.path,
                    type: "dir",
                    files: entry.files,
                    folders: [...entry.children.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 12)
                        .map(([name, count]) => ({ path: `${entry.path}/${name}`, files: count })),
                },
        ),
    };
}

function keyDocs(files) {
    const docs = [];
    for (const path of files) {
        const rank = DOCS.findIndex(([pattern]) => pattern.test(path));
        if (rank >= 0) docs.push({ path, kind: DOCS[rank][1], rank });
    }
    return docs
        .sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path))
        .slice(0, 40)
        .map(({ path, kind }) => ({ path, kind }));
}

async function hotspots(root, ref, fileSet) {
    if (!ref) return { window: null, files: [] };
    // Merge commits list no files, so they do not count toward the window choice.
    const recent = Number((await git(root, ["rev-list", "--count", "--no-merges", "--since=90 days ago", ref], { allowFailure: true }))?.trim() || 0);
    const window = recent >= 10 ? "last 90 days" : "last 200 commits";
    const range = recent >= 10 ? ["--since=90 days ago"] : ["-n", "200"];
    const log = (await git(root, ["log", ref, ...range, "--no-merges", "--no-renames", "--name-only", "--format="], { allowFailure: true })) ?? "";
    const counts = new Map();
    for (const path of log.split("\n")) {
        if (path && fileSet.has(path) && isSource(path)) counts.set(path, (counts.get(path) ?? 0) + 1);
    }
    const files = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([path, commits]) => ({ path, commits }));
    const lastCommitAt = (await git(root, ["log", "-1", "--format=%cI", ref], { allowFailure: true }))?.trim() || null;
    return { window, files, lastCommitAt };
}

// Subjects of the latest commits (not merges). The agents have no shell, so
// this is how they see the commit message style.
async function recentCommitSubjects(root, ref) {
    if (!ref) return [];
    const log = await git(root, ["log", ref, "--no-merges", "-n", String(RECENT_COMMITS), "--format=%s"], { allowFailure: true });
    return (log ?? "")
        .split("\n")
        .map((subject) => subject.trim().slice(0, 120))
        .filter(Boolean);
}

export async function scanRepository(rootPath, { now = new Date() } = {}) {
    const repo = await readRepository(rootPath);
    const files = await listTrackedFiles(repo.root);
    const sourceFiles = files.filter(isSource);
    const sizeClass = files.length <= SMALL_REPOSITORY_LIMIT ? "small" : "large";
    const { languages, lines } = await languageStats(repo.root, sourceFiles, sizeClass === "small");
    const fullName = repo.owner && repo.name ? `${repo.owner}/${repo.name}` : null;

    const repository = {
        guideId: guideIdFor({ owner: repo.owner, name: repo.name, rootPath: repo.root }),
        rootPath: repo.root,
        fullName,
        name: repo.name ?? repo.root.slice(repo.root.lastIndexOf("/") + 1),
        url: fullName ? `https://github.com/${fullName}` : null,
        defaultBranch: repo.defaultBranch,
        defaultBranchCommit: repo.defaultBranchCommit,
        headBranch: repo.headBranch,
        headCommit: repo.headCommit,
        linkRef: repo.linkRef,
    };
    const historyRef = repo.defaultRef ?? (repo.headCommit ? "HEAD" : null);
    const tree = topLevelTree(files);
    const scan = {
        scannedAt: now.toISOString(),
        size: { trackedFiles: files.length, sourceFiles: sourceFiles.length, lines, sizeClass, limit: SMALL_REPOSITORY_LIMIT },
        languages,
        tree: tree.entries,
        treeOmitted: tree.omitted,
        docs: keyDocs(files),
        hotspots: await hotspots(repo.root, historyRef, new Set(files)),
        recentCommits: await recentCommitSubjects(repo.root, historyRef),
    };
    return { repository, scan };
}
