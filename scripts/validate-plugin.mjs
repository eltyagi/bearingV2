#!/usr/bin/env node
// Validates the marketplace, the plugin manifest, agents, skills, and extensions
// against the conventions that this repository follows. Exit code 1 on errors.

import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { FrontmatterError, parseFrontmatter } from "./lib/frontmatter.mjs";

const execFileAsync = promisify(execFile);

// Tool names that Bearing v1 registers. A second extension with the same tool
// name fails to load, so V2 must never reuse them.
export const V1_TOOL_NAMES = Object.freeze([
    "bearing_analyze_repository",
    "bearing_create_workspace",
    "bearing_generate_onboarding_canvas",
    "bearing_get_workspace",
    "bearing_rank_first_tasks",
    "bearing_record_onboarding_context",
    "bearing_validate_setup",
]);

// Host tool names that resolve for a plugin subagent in the Copilot app (step 1
// spike). The runtime drops unknown names without an error, so agents may list
// only these names and the tools of this plugin's extensions.
export const KNOWN_HOST_TOOLS = Object.freeze(["view", "grep", "glob", "semantic_code_search"]);

// Agents in this plugin never get a shell; read-only extension tools replace it.
const SHELL_TOOLS = new Set(["bash", "execute", "shell", "powershell", "read_bash", "stop_bash", "list_bash"]);
const ALIAS_HINTS = new Map([
    ["search", 'the "search" alias maps to no tool in the Copilot app; use "grep" and "glob"'],
    ["read", 'use the exact tool name "view" instead of the "read" alias'],
]);

export const LIMITS = Object.freeze({
    nameMaxLength: 64,
    agentDescriptionMin: 50,
    agentDescriptionMax: 150,
    agentBodyMaxChars: 30_000,
    skillDescriptionMin: 10,
    skillDescriptionMax: 1024,
    skillCompatibilityMax: 500,
    skillBodyMaxLines: 500,
    marketplaceDescriptionMax: 1024,
    keywordsMax: 10,
    fileMaxBytes: 1024 * 1024,
});

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const TEXT_EXTENSIONS = new Set([".md", ".json", ".mjs", ".js", ".css", ".html", ".txt", ".yml", ".yaml", ".svg"]);
const AGENT_KEYS = new Set([
    "name",
    "description",
    "tools",
    "model",
    "target",
    "user-invocable",
    "disable-model-invocation",
    "mcp-servers",
    "metadata",
    "argument-hint",
    "handoffs",
]);
const SKILL_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools", "argument-hint"]);
const PATH_FIELDS = ["agents", "skills", "extensions"];

function createReport(repoRoot) {
    const errors = [];
    const warnings = [];
    const where = (path) => relative(repoRoot, path).split(sep).join("/") || ".";
    return {
        errors,
        warnings,
        where,
        error: (path, message) => errors.push(`${where(path)}: ${message}`),
        warn: (path, message) => warnings.push(`${where(path)}: ${message}`),
    };
}

async function pathKind(path) {
    try {
        const info = await stat(path);
        return info.isDirectory() ? "dir" : "file";
    } catch {
        return null;
    }
}

function isInside(root, path) {
    const rel = relative(root, path);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isSafeRelativePath(value) {
    return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !value.split(/[\\/]/).includes("..");
}

async function listFiles(dir) {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) files.push(...(await listFiles(path)));
        else if (entry.isFile()) files.push(path);
    }
    return files.sort();
}

async function readJson(path, report) {
    let text;
    try {
        text = await readFile(path, "utf8");
    } catch {
        report.error(path, "the file does not exist");
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        report.error(path, `the file is not valid JSON (${error.message})`);
        return null;
    }
}

async function readFrontmatter(path, report) {
    const text = await readFile(path, "utf8");
    try {
        const parsed = parseFrontmatter(text);
        if (!parsed) report.error(path, "the file has no YAML frontmatter");
        return parsed;
    } catch (error) {
        if (!(error instanceof FrontmatterError)) throw error;
        report.error(path, `the frontmatter is not valid (${error.message})`);
        return null;
    }
}

function checkName(path, label, value, report) {
    if (typeof value !== "string" || !NAME_PATTERN.test(value)) {
        report.error(path, `${label} "${value}" must use lowercase letters, digits, and single hyphens`);
        return false;
    }
    if (value.length > LIMITS.nameMaxLength) {
        report.error(path, `${label} "${value}" is longer than ${LIMITS.nameMaxLength} characters`);
        return false;
    }
    return true;
}

function checkDescription(path, label, value, min, max, report) {
    if (typeof value !== "string" || value.trim() === "") {
        report.error(path, `${label} is required`);
        return;
    }
    const length = value.trim().length;
    if (length < min || length > max) {
        report.error(path, `${label} length is ${length}; it must be ${min} to ${max} characters`);
    }
}

function checkKeywords(path, keywords, report) {
    if (keywords === undefined) return;
    if (!Array.isArray(keywords)) {
        report.error(path, "keywords must be an array");
        return;
    }
    if (keywords.length > LIMITS.keywordsMax) report.warn(path, `use ${LIMITS.keywordsMax} keywords or fewer`);
    for (const keyword of keywords) {
        if (typeof keyword !== "string" || !NAME_PATTERN.test(keyword)) {
            report.error(path, `keyword "${keyword}" must be lowercase and hyphenated`);
        }
    }
}

function validateMarketplace(path, marketplace, report) {
    checkName(path, "marketplace name", marketplace.name, report);
    if (typeof marketplace.owner?.name !== "string" || marketplace.owner.name.trim() === "") {
        report.error(path, "owner.name is required");
    }
    if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
        report.error(path, "plugins must be a non-empty array");
        return;
    }
    const seen = new Set();
    for (const [index, entry] of marketplace.plugins.entries()) {
        const label = `plugins[${index}]`;
        checkName(path, `${label}.name`, entry?.name, report);
        if (seen.has(entry?.name)) report.error(path, `${label}.name "${entry.name}" is listed more than once`);
        seen.add(entry?.name);
        if (typeof entry?.source !== "string" || !entry.source.startsWith("./") || !isSafeRelativePath(entry.source)) {
            report.error(path, `${label}.source must be a relative path that starts with "./"`);
        }
        if (typeof entry?.version !== "string" || !SEMVER_PATTERN.test(entry.version)) {
            report.error(path, `${label}.version "${entry?.version}" must be a semantic version`);
        }
        checkDescription(path, `${label}.description`, entry?.description, 1, LIMITS.marketplaceDescriptionMax, report);
        checkKeywords(path, entry?.keywords, report);
    }
}

async function validateExtensions(dir, context, report) {
    const toolNames = new Map();
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const extensionDir = join(dir, entry.name);
        checkName(extensionDir, "extension folder name", entry.name, report);
        if ((await pathKind(join(extensionDir, "extension.mjs"))) !== "file") {
            report.error(extensionDir, "extension.mjs is missing");
            continue;
        }
        if (await pathKind(join(extensionDir, "node_modules"))) {
            report.error(extensionDir, "do not ship node_modules; the runtime resolves @github/copilot-sdk");
        }
        for (const file of await listFiles(extensionDir)) {
            const rel = relative(extensionDir, file).split(sep).join("/");
            if (rel.startsWith("node_modules/")) continue;
            if (basename(file) === "package.json") {
                const manifest = await readJson(file, report);
                if (manifest && Object.keys(manifest.dependencies ?? {}).length > 0) {
                    report.error(file, "the extension must not declare runtime dependencies");
                }
            }
            if (extname(file) !== ".mjs") continue;
            try {
                await execFileAsync(process.execPath, ["--check", file], { timeout: 20_000 });
            } catch (error) {
                report.error(file, `syntax check failed: ${String(error.stderr || error.message).trim().split("\n")[0]}`);
            }
            const source = await readFile(file, "utf8");
            if (/\bconsole\.(log|info|debug)\s*\(/.test(source)) {
                report.error(file, "do not use console.log/info/debug; stdout is reserved for JSON-RPC");
            }
            if (/process\.stdout\.write\s*\(/.test(source)) {
                report.error(file, "do not write to process.stdout; it is reserved for JSON-RPC");
            }
            const importsSdk = /(?:from\s+|import\s*\(\s*)["']@github\/copilot-sdk/.test(source);
            if (importsSdk && rel !== "extension.mjs") {
                report.error(file, "only extension.mjs may import @github/copilot-sdk; keep lib/ testable");
            }
            for (const match of source.matchAll(/\bname:\s*["'](bearing_[a-z0-9_]+)["']/g)) {
                const name = match[1];
                if (toolNames.has(name)) report.error(file, `tool name "${name}" is defined more than once`);
                toolNames.set(name, file);
                if (V1_TOOL_NAMES.includes(name)) {
                    report.error(file, `tool name "${name}" collides with Bearing v1; the second extension would fail to load`);
                }
            }
        }
    }
    context.toolNames = new Set(toolNames.keys());
}

async function validateAgents(dir, context, report) {
    context.agentNames = new Set();
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const path = join(dir, entry.name);
        if (!entry.name.endsWith(".agent.md")) {
            report.warn(path, "agent files must end with .agent.md; this file is ignored");
            continue;
        }
        const stem = entry.name.slice(0, -".agent.md".length);
        checkName(path, "agent file name", stem, report);
        const parsed = await readFrontmatter(path, report);
        if (!parsed) continue;
        const { data, body } = parsed;
        for (const key of Object.keys(data)) {
            if (key === "infer") report.error(path, "the infer property is retired; use disable-model-invocation");
            else if (!AGENT_KEYS.has(key)) report.warn(path, `unknown frontmatter property "${key}"`);
        }
        if (data.name !== stem) report.error(path, `name "${data.name}" must equal the file name "${stem}"`);
        context.agentNames.add(stem);
        checkDescription(path, "description", data.description, LIMITS.agentDescriptionMin, LIMITS.agentDescriptionMax, report);
        if (!Array.isArray(data.tools) || data.tools.length === 0) {
            report.error(path, "tools must be an explicit, non-empty list (least privilege)");
        } else {
            const unique = new Set(data.tools);
            if (unique.size !== data.tools.length) report.error(path, "tools has duplicate entries");
            for (const tool of data.tools) {
                if (typeof tool !== "string" || tool.trim() === "") report.error(path, "each tool must be a non-empty string");
                else if (ALIAS_HINTS.has(tool)) report.error(path, ALIAS_HINTS.get(tool));
                else if (SHELL_TOOLS.has(tool)) {
                    report.error(path, `tool "${tool}" gives shell access; add a read-only extension tool instead`);
                } else if (tool.startsWith("bearing_")) {
                    if (!context.toolNames?.has(tool)) report.error(path, `tool "${tool}" is not defined by any extension in this plugin`);
                } else if (!KNOWN_HOST_TOOLS.includes(tool)) {
                    report.error(path, `tool "${tool}" is not a known tool name; the runtime would drop it without an error`);
                }
            }
        }
        for (const key of ["user-invocable", "disable-model-invocation"]) {
            if (key in data && typeof data[key] !== "boolean") report.error(path, `${key} must be true or false`);
        }
        if (body.trim() === "") report.error(path, "the agent body is empty");
        if (body.length > LIMITS.agentBodyMaxChars) {
            report.error(path, `the agent body has ${body.length} characters; the limit is ${LIMITS.agentBodyMaxChars}`);
        }
    }
}

async function validateSkills(dir, context, report) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillDir = join(dir, entry.name);
        const path = join(skillDir, "SKILL.md");
        checkName(skillDir, "skill folder name", entry.name, report);
        if ((await pathKind(path)) !== "file") {
            report.error(skillDir, "SKILL.md is missing");
            continue;
        }
        const parsed = await readFrontmatter(path, report);
        if (!parsed) continue;
        const { data, body } = parsed;
        for (const key of Object.keys(data)) {
            if (!SKILL_KEYS.has(key)) report.warn(path, `unknown frontmatter property "${key}"`);
        }
        if (data.name !== entry.name) report.error(path, `name "${data.name}" must equal the folder name "${entry.name}"`);
        checkDescription(path, "description", data.description, LIMITS.skillDescriptionMin, LIMITS.skillDescriptionMax, report);
        if (data.license !== undefined && typeof data.license !== "string") report.error(path, "license must be a string");
        if (data.compatibility !== undefined) {
            checkDescription(path, "compatibility", data.compatibility, 1, LIMITS.skillCompatibilityMax, report);
        }
        if (data["allowed-tools"] !== undefined) {
            if (typeof data["allowed-tools"] !== "string") report.error(path, "allowed-tools must be a space-separated string");
            else if (/\b(shell|bash|execute|powershell)\b/i.test(data["allowed-tools"])) {
                report.error(path, "allowed-tools must not pre-approve shell access");
            }
        }
        const lineCount = body.split("\n").length;
        if (lineCount > LIMITS.skillBodyMaxLines) {
            report.error(path, `the body has ${lineCount} lines; keep SKILL.md under ${LIMITS.skillBodyMaxLines} lines`);
        }
        for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) {
            const target = match[1].split("#")[0];
            if (!target || /^[a-z]+:/i.test(target)) continue;
            const resolved = resolve(skillDir, target);
            if (!isInside(skillDir, resolved)) report.error(path, `link "${target}" points outside the skill folder`);
            else if (!(await pathKind(resolved))) report.error(path, `link "${target}" does not exist`);
        }
        for (const file of await listFiles(skillDir)) {
            if (extname(file) !== ".md") continue;
            const text = await readFile(file, "utf8");
            for (const match of text.matchAll(new RegExp(`\\b${context.pluginName}:([a-z0-9-]+)\\b`, "g"))) {
                if (!context.agentNames?.has(match[1])) {
                    report.error(file, `agent "${context.pluginName}:${match[1]}" is not defined in this plugin`);
                }
            }
        }
    }
}

async function validateFiles(pluginRoot, report) {
    for (const file of await listFiles(pluginRoot)) {
        const info = await stat(file);
        if (info.size > LIMITS.fileMaxBytes) report.warn(file, "the file is larger than 1 MB");
        if (!TEXT_EXTENSIONS.has(extname(file))) continue;
        const text = await readFile(file, "utf8");
        if (text.includes("\r\n")) report.error(file, "use LF line endings, not CRLF");
    }
}

async function validatePlugin(pluginRoot, entry, report) {
    const manifestPath = join(pluginRoot, "plugin.json");
    const manifest = await readJson(manifestPath, report);
    if (!manifest) return;
    if (manifest.name !== entry.name) report.error(manifestPath, `name "${manifest.name}" must equal the marketplace name "${entry.name}"`);
    if (manifest.version !== entry.version) {
        report.error(manifestPath, `version "${manifest.version}" must equal the marketplace version "${entry.version}"`);
    }
    if (manifest.description !== entry.description) report.warn(manifestPath, "description differs from the marketplace entry");
    if ("$schema" in manifest && PATH_FIELDS.some((field) => field in manifest)) {
        report.error(manifestPath, "Agent Plugins 1.0 ($schema) does not allow the agents, skills, or extensions path fields");
    }
    if (typeof manifest.license !== "string") report.warn(manifestPath, "license is not set");
    checkKeywords(manifestPath, manifest.keywords, report);

    const context = { pluginName: manifest.name };
    const dirs = {};
    for (const field of PATH_FIELDS) {
        if (manifest[field] === undefined) continue;
        if (!isSafeRelativePath(manifest[field])) {
            report.error(manifestPath, `${field} must be a relative path inside the plugin`);
            continue;
        }
        const dir = resolve(pluginRoot, manifest[field]);
        if ((await pathKind(dir)) !== "dir") report.error(manifestPath, `${field} folder "${manifest[field]}" does not exist`);
        else dirs[field] = dir;
    }
    if (dirs.extensions) await validateExtensions(dirs.extensions, context, report);
    if (dirs.agents) await validateAgents(dirs.agents, context, report);
    if (dirs.skills) await validateSkills(dirs.skills, context, report);
    await validateFiles(pluginRoot, report);
}

export async function validateRepository(repoRoot) {
    const root = resolve(repoRoot);
    const report = createReport(root);
    const marketplacePath = join(root, ".github/plugin/marketplace.json");
    const marketplace = await readJson(marketplacePath, report);
    if (marketplace) {
        validateMarketplace(marketplacePath, marketplace, report);
        for (const entry of Array.isArray(marketplace.plugins) ? marketplace.plugins : []) {
            if (!isSafeRelativePath(entry?.source)) continue;
            const pluginRoot = resolve(root, entry.source);
            if (!isInside(root, pluginRoot) || (await pathKind(pluginRoot)) !== "dir") {
                report.error(marketplacePath, `plugin source "${entry.source}" is not a folder in this repository`);
                continue;
            }
            await validatePlugin(pluginRoot, entry, report);
        }
    }
    return { ok: report.errors.length === 0, errors: report.errors, warnings: report.warnings };
}

const invokedDirectly = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
    const repoRoot = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
    const result = await validateRepository(repoRoot);
    for (const warning of result.warnings) process.stderr.write(`warning  ${warning}\n`);
    for (const error of result.errors) process.stderr.write(`error    ${error}\n`);
    process.stderr.write(
        result.ok
            ? `Plugin validation passed (${result.warnings.length} warnings).\n`
            : `Plugin validation failed: ${result.errors.length} errors, ${result.warnings.length} warnings.\n`,
    );
    process.exitCode = result.ok ? 0 : 1;
}
