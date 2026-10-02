// Light checks for saved sections. They fix what they can (long lists, long
// text, missing IDs, references to files that do not exist) and return
// warnings. Only a missing required field is an error.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { BearingError } from "./git.mjs";

export const SAVE_TARGETS = ["overview", "map", "architecture", "conventions", "workflow", "pull-request", "changes", "journey"];

const REQUIRED = {
    overview: ["summary"],
    map: ["areas"],
    architecture: ["summary"],
    conventions: ["conventions"],
    workflow: ["commands"],
    "pull-request": ["number", "summary", "walkthrough"],
    changes: [],
    journey: ["welcome", "firstSteps"],
};

// Pull request fields that come from GitHub. They replace the agent's copies.
const PR_FACT_KEYS = ["number", "title", "url", "author", "mergedAt", "labels", "additions", "deletions", "changedFiles", "files", "closingIssues"];

const LIST_LIMITS = {
    overview: { stack: 12, startHere: 6 },
    map: { areas: 40, lookups: 15 },
    architecture: { components: 12, flows: 3, decisions: 8 },
    conventions: { conventions: 20 },
    workflow: { setup: 10, commands: 20, ci: 8, contributing: 10 },
    "pull-request": { labels: 8, files: 40, walkthrough: 8, reviewNotes: 5, teaches: 4 },
    changes: {},
    journey: { firstSteps: 10, gaps: 8 },
};

// Lists whose items get stable IDs, and the field that names each item.
const ID_LISTS = {
    map: { areas: "path", lookups: "question" },
    architecture: { components: "name", flows: "name", decisions: "title" },
    conventions: { conventions: "title" },
    journey: { firstSteps: "title" },
};

// Sections that describe the current tree, so their file references must exist.
const CHECKED_SECTIONS = new Set(["overview", "map", "architecture", "conventions", "workflow"]);

const MAX_TEXT = 2000;
const MAX_EXCERPT_CHARS = 4000;
const MAX_EXCERPT_LINES = 30;
const MAX_NESTED_LIST = 12;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function slugify(value) {
    const slug = String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)
        .replace(/-+$/, "");
    return slug || "item";
}

function assignIds(items, labelKey) {
    const used = new Set();
    for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const base = typeof item.id === "string" && ID_PATTERN.test(item.id) ? item.id : slugify(item[labelKey]);
        let id = base;
        for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
        item.id = id;
        used.add(id);
    }
}

// Cuts long text, long excerpts, and long nested lists. Depth 0 is the section.
function trim(value, key, depth, warnings, where) {
    if (typeof value === "string") {
        if (key === "excerpt" || key === "snippet") {
            const lines = value.split("\n");
            if (lines.length > MAX_EXCERPT_LINES || value.length > MAX_EXCERPT_CHARS) {
                warnings.push(`${where}: excerpt cut to ${MAX_EXCERPT_LINES} lines`);
                return lines.slice(0, MAX_EXCERPT_LINES).join("\n").slice(0, MAX_EXCERPT_CHARS);
            }
            return value;
        }
        if (value.length > MAX_TEXT) {
            warnings.push(`${where}: text cut to ${MAX_TEXT} characters`);
            return `${value.slice(0, MAX_TEXT - 1)}…`;
        }
        return value;
    }
    if (Array.isArray(value)) {
        let list = value;
        if (depth >= 3 && list.length > MAX_NESTED_LIST) {
            warnings.push(`${where}: kept the first ${MAX_NESTED_LIST} of ${list.length} items`);
            list = list.slice(0, MAX_NESTED_LIST);
        }
        return list.map((item, index) => trim(item, key, depth + 1, warnings, `${where}[${index}]`));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([childKey, child]) => [childKey, trim(child, childKey, depth + 1, warnings, where ? `${where}.${childKey}` : childKey)]),
        );
    }
    return value;
}

function cleanPath(value) {
    if (typeof value !== "string") return null;
    const path = value.trim().replace(/^\.\//, "").replace(/\/+$/, "");
    if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) return null;
    return path;
}

async function fileInfo(value, context) {
    const path = cleanPath(value);
    if (!path) return null;
    if (context.cache.has(path)) return context.cache.get(path);
    let info = null;
    try {
        const absolute = join(context.root, path);
        const stats = await stat(absolute);
        info = { path, isFile: stats.isFile(), lines: null };
        if (stats.isFile() && stats.size <= 2 * 1024 * 1024) info.lines = (await readFile(absolute, "utf8")).split("\n").length;
    } catch {
        info = null;
    }
    context.cache.set(path, info);
    return info;
}

function checkLines(ref, info, context, where) {
    if (ref.startLine === undefined && ref.endLine === undefined) return;
    const start = ref.startLine;
    const end = ref.endLine ?? ref.startLine;
    const valid = info.isFile && Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start && (info.lines === null || end <= info.lines);
    if (!valid) {
        context.warnings.push(`${where}: lines ${start}-${end} are not valid for "${info.path}" (${info.lines ?? "?"} lines); line numbers removed`);
        delete ref.startLine;
        delete ref.endLine;
    }
}

// Removes objects whose "path" does not exist and strings in "paths" lists that do not exist.
async function verifyPaths(node, key, context, where) {
    if (Array.isArray(node)) {
        const kept = [];
        for (const [index, item] of node.entries()) {
            if (key === "paths" && typeof item === "string") {
                const info = await fileInfo(item, context);
                if (info) kept.push(info.path);
                else context.warnings.push(`${where}[${index}]: "${item}" does not exist; removed`);
                continue;
            }
            const result = await verifyPaths(item, key, context, `${where}[${index}]`);
            if (result !== undefined) kept.push(result);
        }
        return kept;
    }
    if (!node || typeof node !== "object") return node;
    if ("path" in node) {
        const info = await fileInfo(node.path, context);
        if (!info) {
            context.warnings.push(`${where}: "${node.path}" does not exist; removed`);
            return undefined;
        }
        node.path = info.path;
        checkLines(node, info, context, where);
    }
    for (const [childKey, child] of Object.entries(node)) {
        if (childKey === "path" || !child || typeof child !== "object") continue;
        const result = await verifyPaths(child, childKey, context, `${where}.${childKey}`);
        if (result === undefined) delete node[childKey];
        else node[childKey] = result;
    }
    return node;
}

export async function prepareSection(section, data, rootPath) {
    if (!SAVE_TARGETS.includes(section)) {
        throw new BearingError("unknown_section", `Unknown section "${section}". Use one of: ${SAVE_TARGETS.join(", ")}.`);
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new BearingError("section_invalid", "data must be an object.");
    const missing = REQUIRED[section].filter((key) => {
        const value = data[key];
        return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    });
    if (missing.length) throw new BearingError("section_invalid", `The ${section} data needs: ${missing.join(", ")}.`);
    if (section === "pull-request" && !(Number.isInteger(data.number) && data.number > 0)) {
        throw new BearingError("section_invalid", "number must be the pull request number.");
    }

    const warnings = [];
    let clean = structuredClone(data);
    for (const [key, limit] of Object.entries(LIST_LIMITS[section])) {
        if (clean[key] === undefined) continue;
        if (!Array.isArray(clean[key])) throw new BearingError("section_invalid", `${key} must be a list.`);
        if (clean[key].length > limit) {
            warnings.push(`${key}: kept the first ${limit} of ${clean[key].length} items`);
            clean[key] = clean[key].slice(0, limit);
        }
    }
    if (section === "changes" && "pullRequests" in clean) {
        delete clean.pullRequests;
        warnings.push('pullRequests ignored: save each pull request with section "pull-request".');
    }
    clean = trim(clean, null, 0, warnings, "");
    if (CHECKED_SECTIONS.has(section) && rootPath) {
        clean = await verifyPaths(clean, null, { root: rootPath, warnings, cache: new Map() }, section);
    }
    for (const [key, labelKey] of Object.entries(ID_LISTS[section] ?? {})) {
        if (Array.isArray(clean[key])) assignIds(clean[key], labelKey);
    }
    return { data: clean, warnings };
}

function pickFacts(pr) {
    return Object.fromEntries(PR_FACT_KEYS.filter((key) => pr?.[key] !== undefined).map((key) => [key, pr[key]]));
}

function sortPullRequests(list) {
    return list.sort((a, b) => String(b.mergedAt ?? "").localeCompare(String(a.mergedAt ?? ""))).slice(0, 10);
}

// Records GitHub facts for pull requests. With replace, the list becomes
// exactly these pull requests (walkthroughs that exist are kept).
export function recordPullRequestFacts(guide, factsList, { replace = false, now = new Date() } = {}) {
    const existing = guide.sections.changes ?? { status: "pending" };
    const byNumber = new Map((existing.pullRequests ?? []).map((pr) => [pr.number, pr]));
    const updated = factsList.map((facts) => ({ status: "pending", ...byNumber.get(facts.number), ...pickFacts(facts) }));
    const others = replace ? [] : (existing.pullRequests ?? []).filter((pr) => !factsList.some((facts) => facts.number === pr.number));
    guide.sections.changes = {
        ...existing,
        status: existing.status === "ready" ? "ready" : "pending",
        reason: undefined,
        pullRequests: sortPullRequests([...others, ...updated]),
        updatedAt: now.toISOString(),
    };
    return guide.sections.changes;
}

export function applySection(guide, section, data, { status = "ready", reason = null, now = new Date() } = {}) {
    const time = now.toISOString();
    const existing = guide.sections[section === "pull-request" ? "changes" : section] ?? {};
    if (section === "pull-request") {
        const current = (existing.pullRequests ?? []).find((pr) => pr.number === data.number);
        const entry = { ...data, ...pickFacts(current), status: "ready", savedAt: time };
        entry.title ??= `Pull request #${data.number}`;
        if (!entry.url && guide.repository?.fullName) entry.url = `https://github.com/${guide.repository.fullName}/pull/${data.number}`;
        const others = (existing.pullRequests ?? []).filter((pr) => pr.number !== data.number);
        guide.sections.changes = { ...existing, status: existing.status ?? "pending", pullRequests: sortPullRequests([...others, entry]), updatedAt: time };
        return guide.sections.changes;
    }
    if (status === "unavailable") {
        guide.sections[section] = { ...existing, status, reason: reason || "No reason was given.", updatedAt: time };
    } else if (section === "changes") {
        guide.sections.changes = { ...existing, ...data, pullRequests: existing.pullRequests ?? [], status: "ready", reason: undefined, updatedAt: time };
    } else {
        guide.sections[section] = { ...data, status: "ready", updatedAt: time };
    }
    return guide.sections[section];
}

function pick(list, ...keys) {
    return Array.isArray(list) ? list.map((item) => Object.fromEntries(keys.map((key) => [key, item?.[key]]))) : [];
}

export function guideOutline(guide) {
    const s = guide.sections;
    const state = (section) => (section?.status === "unavailable" ? { status: "unavailable", reason: section.reason } : { status: section?.status ?? "pending" });
    return {
        guideId: guide.guideId,
        repository: {
            fullName: guide.repository.fullName,
            rootPath: guide.repository.rootPath,
            defaultBranch: guide.repository.defaultBranch,
            headCommit: guide.repository.headCommit,
        },
        updatedAt: guide.updatedAt,
        sections: {
            overview: state(s.overview),
            map: { ...state(s.map), areas: pick(s.map?.areas, "id", "path"), lookups: pick(s.map?.lookups, "id", "question") },
            architecture: { ...state(s.architecture), components: pick(s.architecture?.components, "id", "name"), flows: pick(s.architecture?.flows, "id", "name") },
            conventions: { ...state(s.conventions), conventions: pick(s.conventions?.conventions, "id", "title") },
            workflow: { ...state(s.workflow), commands: s.workflow?.commands?.length ?? 0 },
            changes: { ...state(s.changes), pullRequests: pick(s.changes?.pullRequests, "number", "title", "status") },
            journey: { ...state(s.journey), firstSteps: pick(s.journey?.firstSteps, "id", "title") },
        },
    };
}
