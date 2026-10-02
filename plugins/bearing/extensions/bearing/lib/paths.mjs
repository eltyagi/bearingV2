// Storage locations and guide IDs. Guides are per user and per repository:
// ${COPILOT_HOME:-~/.copilot}/extensions/bearing/artifacts/guides/<guideId>/

import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const GUIDE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}__[a-z0-9][a-z0-9._-]{0,120}$/;

export function copilotHome(env = process.env) {
    const configured = env.COPILOT_HOME?.trim();
    return configured ? configured : join(homedir(), ".copilot");
}

export function dataRoot(env = process.env) {
    return join(copilotHome(env), "extensions", "bearing", "artifacts");
}

export function guidesRoot(env = process.env) {
    return join(dataRoot(env), "guides");
}

function slug(value, fallback) {
    const cleaned = String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^[^a-z0-9]+/, "")
        .replace(/[-.]+$/, "")
        .replace(/\.{2,}/g, ".")
        .slice(0, 100);
    return cleaned || fallback;
}

// GitHub repositories: "<owner>__<name>". Other repositories: "local__<folder>-<hash of the path>".
export function guideIdFor({ owner, name, rootPath }) {
    if (owner && name) return `${slug(owner, "owner")}__${slug(name, "repo")}`;
    const hash = createHash("sha256").update(String(rootPath)).digest("hex").slice(0, 10);
    return `local__${slug(basename(String(rootPath)), "repo")}-${hash}`;
}

export function isValidGuideId(guideId) {
    return typeof guideId === "string" && GUIDE_ID_PATTERN.test(guideId) && !guideId.includes("..");
}

export function guideDir(guideId, env = process.env) {
    if (!isValidGuideId(guideId)) throw new Error(`Invalid guide ID: ${guideId}`);
    return join(guidesRoot(env), guideId);
}
