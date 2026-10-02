// Bearing extension entry point: wiring only. The logic is in lib/ and the
// canvas page is in ui/.

import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { startCanvasServer } from "./lib/canvas-server.mjs";
import { loadGuide, SECTIONS } from "./lib/guide-store.mjs";
import { isValidGuideId } from "./lib/paths.mjs";
import { guideTools } from "./lib/tools.mjs";

const instances = new Map(); // instanceId -> canvas server
let resolveSession;
const sessionReady = new Promise((resolve) => {
    resolveSession = resolve;
});

async function sendPrompt(prompt) {
    const session = await sessionReady;
    await session.send({ prompt });
}

const guideCanvas = createCanvas({
    id: "bearing-guide",
    displayName: "Bearing onboarding guide",
    description:
        "Interactive onboarding guide for a repository: codebase map, architecture, conventions, workflow, walkthroughs of recent pull requests, and first steps. Open it with the guideId from bearing_scan_repository.",
    inputSchema: {
        type: "object",
        properties: {
            guideId: {
                type: "string",
                pattern: "^[a-z0-9][a-z0-9._-]{0,99}__[a-z0-9][a-z0-9._-]{0,120}$",
                description: "The guideId from bearing_scan_repository.",
            },
        },
        required: ["guideId"],
        additionalProperties: false,
    },
    actions: [
        {
            name: "show_section",
            description: "Show one section of the guide. Optionally scroll to one item: an item ID from bearing_get_guide, or a pull request number.",
            inputSchema: {
                type: "object",
                properties: {
                    section: { type: "string", enum: SECTIONS },
                    itemId: { type: "string", maxLength: 100 },
                },
                required: ["section"],
                additionalProperties: false,
            },
            handler: async (ctx) => {
                const server = instances.get(ctx.instanceId);
                if (!server) throw new CanvasError("bearing_canvas_not_open", "Open the canvas first.");
                const viewers = server.navigate(ctx.input.section, ctx.input.itemId);
                return viewers > 0
                    ? { shown: ctx.input.section, itemId: ctx.input.itemId ?? null }
                    : { shown: null, hint: "The canvas page is not visible now. Call open_canvas with the same instanceId to show it." };
            },
        },
    ],
    open: async (ctx) => {
        const guideId = ctx.input?.guideId;
        if (!isValidGuideId(guideId)) throw new CanvasError("bearing_invalid_guide_id", "guideId is not valid.");
        const guide = await loadGuide(guideId);
        if (!guide) throw new CanvasError("bearing_guide_not_found", `No guide "${guideId}". Call bearing_scan_repository first.`);

        let server = instances.get(ctx.instanceId);
        if (!server) {
            server = await startCanvasServer({ guideId, sendPrompt });
            instances.set(ctx.instanceId, server);
        } else if (server.guideId !== guideId) {
            server.setGuideId(guideId);
        }
        const ready = SECTIONS.filter((section) => guide.sections?.[section]?.status === "ready").length;
        return {
            title: `Onboarding: ${guide.repository?.fullName ?? guide.repository?.name ?? guideId}`,
            status: `${ready} of ${SECTIONS.length} sections ready`,
            url: server.url,
        };
    },
    onClose: async (ctx) => {
        const server = instances.get(ctx.instanceId);
        if (!server) return;
        instances.delete(ctx.instanceId);
        await server.close();
    },
});

const session = await joinSession({ tools: guideTools, canvases: [guideCanvas] });
resolveSession(session);
