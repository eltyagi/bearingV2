// Guide storage: one guide.json and one progress.json for each repository.
// Writes are atomic (temporary file, then rename) and serialized for each
// guide, because two agents can save sections at the same time.

import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { BearingError } from "./git.mjs";
import { guideDir } from "./paths.mjs";

export const SECTIONS = ["overview", "map", "architecture", "conventions", "workflow", "changes", "journey"];

// Emits "change" with { guideId, section } after each write.
export const guideEvents = new EventEmitter();
guideEvents.setMaxListeners(100);

const locks = new Map();

function withLock(guideId, task) {
    const run = (locks.get(guideId) ?? Promise.resolve()).then(task);
    const tail = run.catch(() => {});
    locks.set(guideId, tail);
    tail.then(() => {
        if (locks.get(guideId) === tail) locks.delete(guideId);
    });
    return run;
}

async function readJson(path) {
    try {
        return JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
}

async function writeJsonAtomic(path, value) {
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temp, path);
}

const guidePath = (guideId) => join(guideDir(guideId), "guide.json");
const progressPath = (guideId) => join(guideDir(guideId), "progress.json");

export async function loadGuide(guideId) {
    return readJson(guidePath(guideId));
}

export async function requireGuide(guideId) {
    const guide = await loadGuide(guideId);
    if (!guide) throw new BearingError("guide_not_found", `No guide "${guideId}". Call bearing_scan_repository first.`);
    return guide;
}

export function createGuide({ repository, scan }, now = new Date()) {
    return withLock(repository.guideId, async () => {
        const guide = {
            schemaVersion: 1,
            guideId: repository.guideId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            repository,
            scan,
            sections: Object.fromEntries(SECTIONS.map((name) => [name, { status: "pending" }])),
        };
        await writeJsonAtomic(guidePath(guide.guideId), guide);
        await writeJsonAtomic(progressPath(guide.guideId), { done: {} });
        guideEvents.emit("change", { guideId: guide.guideId, section: null });
        return guide;
    });
}

// Runs mutate(guide) under the lock, saves the guide, and returns mutate's result.
export function updateGuide(guideId, section, mutate, now = new Date()) {
    return withLock(guideId, async () => {
        const guide = await requireGuide(guideId);
        const result = await mutate(guide);
        guide.updatedAt = now.toISOString();
        await writeJsonAtomic(guidePath(guideId), guide);
        guideEvents.emit("change", { guideId, section });
        return result;
    });
}

export async function loadProgress(guideId) {
    return (await readJson(progressPath(guideId))) ?? { done: {} };
}

export function setStepDone(guideId, stepId, done, now = new Date()) {
    return withLock(`${guideId}:progress`, async () => {
        const progress = await loadProgress(guideId);
        if (done) progress.done[stepId] = now.toISOString();
        else delete progress.done[stepId];
        await writeJsonAtomic(progressPath(guideId), progress);
        guideEvents.emit("change", { guideId, section: "progress" });
        return progress;
    });
}
