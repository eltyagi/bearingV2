// Agent tools for the guide. Each handler returns a compact JSON string.
// Errors are thrown with a clear message; the runtime returns them as failures.

import { BearingError } from "./git.mjs";
import { createGuide, loadGuide, requireGuide, updateGuide } from "./guide-store.mjs";
import { isValidGuideId } from "./paths.mjs";
import { scanRepository } from "./repo-scan.mjs";
import { applySection, guideOutline, prepareSection, SAVE_TARGETS } from "./sections.mjs";

const json = (value) => JSON.stringify(value);

export function requireGuideId(guideId) {
    if (!isValidGuideId(guideId)) throw new BearingError("invalid_guide_id", `"${guideId}" is not a valid guide ID.`);
    return guideId;
}

function scanSummary(repository, scan) {
    return {
        rootPath: repository.rootPath,
        fullName: repository.fullName,
        url: repository.url,
        defaultBranch: repository.defaultBranch,
        headBranch: repository.headBranch,
        headCommit: repository.headCommit?.slice(0, 12) ?? null,
        headIsDefaultBranch: Boolean(repository.headCommit) && repository.headCommit === repository.defaultBranchCommit,
        size: scan.size,
        languages: scan.languages.map((entry) => `${entry.name} ${entry.percent}%`).join(", "),
        topLevel: scan.tree.map((entry) => (entry.type === "dir" ? `${entry.path}/ (${entry.files} files)` : entry.path)),
        docs: scan.docs.map((doc) => `${doc.path} [${doc.kind}]`),
        hotspots: scan.hotspots.files.map((file) => `${file.path} (${file.commits} commits, ${scan.hotspots.window})`),
    };
}

export const scanRepositoryTool = {
    name: "bearing_scan_repository",
    description:
        "Scan a local git repository and create its Bearing onboarding guide. Returns the guideId and repository facts: identity, size, languages, top-level tree, key docs, and hotspots. If a guide already exists, it is not changed unless reset is true.",
    parameters: {
        type: "object",
        properties: {
            rootPath: { type: "string", description: "Absolute path inside the repository. Default: the session working directory." },
            reset: { type: "boolean", description: "Start a new guide even if one exists. Default: false." },
        },
        additionalProperties: false,
    },
    skipPermission: true,
    handler: async ({ rootPath, reset = false } = {}) => {
        const { repository, scan } = await scanRepository(rootPath || process.cwd());
        const warnings = [];
        if (scan.size.sizeClass === "large") {
            warnings.push(`The repository has ${scan.size.trackedFiles} tracked files. Bearing is made for ${scan.size.limit} or fewer, so the guide can be less complete.`);
        }
        if (!repository.fullName) {
            warnings.push("No GitHub remote. semantic_code_search and the pull request tools will not work; use local search and mark the changes section unavailable.");
        }
        const existing = await loadGuide(repository.guideId);
        if (existing && !reset) {
            const outline = guideOutline(existing);
            return json({
                guideId: repository.guideId,
                exists: true,
                createdAt: existing.createdAt,
                updatedAt: existing.updatedAt,
                sections: Object.fromEntries(Object.entries(outline.sections).map(([name, section]) => [name, section.status])),
                warnings: [...warnings, "A guide exists for this repository. Open it, or call again with reset: true to make a new guide."],
            });
        }
        await createGuide({ repository, scan });
        return json({ guideId: repository.guideId, exists: false, created: true, ...scanSummary(repository, scan), warnings });
    },
};

function itemCounts(data) {
    const counts = {};
    const ids = {};
    for (const [key, value] of Object.entries(data)) {
        if (!Array.isArray(value)) continue;
        counts[key] = value.length;
        if (value.some((item) => typeof item?.id === "string")) ids[key] = value.map((item) => item.id);
    }
    return { counts, ids };
}

export const saveGuideSectionTool = {
    name: "bearing_save_guide_section",
    description:
        'Save one section of a Bearing onboarding guide. Open canvases update at once. Sections: overview, map, architecture, conventions, workflow, journey, "pull-request" (adds or replaces one pull request walkthrough), and changes (finishes the pull request section). Your instructions give the data shape of each section. The tool trims long lists, removes references to files that do not exist, and returns warnings. Use status "unavailable" with a reason when you cannot make a section.',
    parameters: {
        type: "object",
        properties: {
            guideId: { type: "string", description: "The guideId from bearing_scan_repository." },
            section: { type: "string", enum: SAVE_TARGETS },
            data: { type: "object", description: "The section content. Not necessary when status is unavailable." },
            status: { type: "string", enum: ["ready", "unavailable"], description: "Default: ready." },
            reason: { type: "string", description: "Why the section is unavailable. Shown to the developer." },
        },
        required: ["guideId", "section"],
        additionalProperties: false,
    },
    skipPermission: true,
    handler: async ({ guideId, section, data, status = "ready", reason } = {}) => {
        requireGuideId(guideId);
        if (status === "unavailable") {
            if (!SAVE_TARGETS.includes(section) || section === "pull-request") {
                throw new BearingError("section_invalid", 'Mark the "changes" section unavailable, not one pull request.');
            }
            await updateGuide(guideId, section, (guide) => applySection(guide, section, null, { status, reason }));
            return json({ saved: section, status: "unavailable" });
        }
        const guide = await requireGuide(guideId);
        const prepared = await prepareSection(section, data, guide.repository.rootPath);
        await updateGuide(guideId, section, (current) => applySection(current, section, prepared.data));
        return json({ saved: section, status: section === "pull-request" ? "added" : "ready", ...itemCounts(prepared.data), warnings: prepared.warnings });
    },
};

export const getGuideTool = {
    name: "bearing_get_guide",
    description: "Get the outline of a Bearing onboarding guide: the status of each section and the IDs and titles of its items.",
    parameters: {
        type: "object",
        properties: { guideId: { type: "string", description: "The guideId from bearing_scan_repository." } },
        required: ["guideId"],
        additionalProperties: false,
    },
    skipPermission: true,
    handler: async ({ guideId } = {}) => json(guideOutline(await requireGuide(requireGuideId(guideId)))),
};

export const guideTools = [scanRepositoryTool, saveGuideSectionTool, getGuideTool];
