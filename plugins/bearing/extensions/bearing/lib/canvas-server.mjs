// Loopback HTTP server for one canvas instance. It serves the UI files, the
// guide JSON, live updates (Server-Sent Events), and three POST actions:
// checklist progress, "Ask Copilot", and opening a GitHub link.

import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { guideEvents, loadGuide, loadProgress, setStepDone } from "./guide-store.mjs";
import { AskError, buildAskPrompt } from "./prompts.mjs";

const UI_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "ui");
const STATIC_FILES = {
    "/app.css": ["app.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"],
    "/dom.js": ["dom.js", "text/javascript; charset=utf-8"],
    "/sections.js": ["sections.js", "text/javascript; charset=utf-8"],
};
// Scripts only from files on this server. Inline styles are allowed because
// the host injects the app theme tokens as inline <style> elements.
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'";
const MAX_BODY_BYTES = 16 * 1024;
const STEP_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function send(res, status, type, body, extraHeaders = {}) {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...extraHeaders });
    res.end(body);
}

const sendJson = (res, status, value) => send(res, status, "application/json; charset=utf-8", JSON.stringify(value));

async function readJsonBody(req) {
    if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw new HttpError(415, "Send JSON.");
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw new HttpError(413, "The request is too large.");
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
        throw new HttpError(400, "The request is not valid JSON.");
    }
}

export function githubUrl(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password ? url.toString() : null;
    } catch {
        return null;
    }
}

export function openInBrowser(url) {
    const [command, args] =
        process.platform === "darwin"
            ? ["open", [url]]
            : process.platform === "win32"
                ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
                : ["xdg-open", [url]];
    return new Promise((resolve, reject) => {
        execFile(command, args, { timeout: 10_000 }, (error) => (error ? reject(error) : resolve()));
    });
}

export async function startCanvasServer({ guideId, sendPrompt, openUrl = openInBrowser }) {
    const token = randomBytes(24).toString("hex");
    const state = { guideId };
    const clients = new Set();
    let port = 0;

    const broadcast = (event, data) => {
        for (const client of clients) client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const onChange = (event) => {
        if (event.guideId === state.guideId) broadcast("change", { section: event.section });
    };
    guideEvents.on("change", onChange);
    const keepAlive = setInterval(() => {
        for (const client of clients) client.write(": keep-alive\n\n");
    }, 25_000);
    keepAlive.unref();

    async function handle(req, res) {
        const host = req.headers.host ?? "";
        if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) throw new HttpError(421, "Unexpected host.");
        const { pathname } = new URL(req.url ?? "/", "http://127.0.0.1");

        if (req.method === "GET") {
            if (pathname === "/") {
                const html = (await readFile(join(UI_DIR, "index.html"), "utf8")).replace("{{TOKEN}}", token);
                return send(res, 200, "text/html; charset=utf-8", html, { "Content-Security-Policy": CSP });
            }
            if (STATIC_FILES[pathname]) {
                const [file, type] = STATIC_FILES[pathname];
                return send(res, 200, type, await readFile(join(UI_DIR, file)));
            }
            if (pathname === "/api/guide") {
                const guide = await loadGuide(state.guideId);
                if (!guide) throw new HttpError(404, "The guide does not exist.");
                return sendJson(res, 200, { guide, progress: await loadProgress(state.guideId) });
            }
            if (pathname === "/events") {
                res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive" });
                res.write("retry: 2000\n\n");
                clients.add(res);
                req.on("close", () => clients.delete(res));
                return undefined;
            }
            throw new HttpError(404, "Not found.");
        }

        if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
        if (req.headers["x-bearing-token"] !== token) throw new HttpError(403, "The request token is not valid.");
        const body = await readJsonBody(req);

        if (pathname === "/api/progress") {
            if (!STEP_ID.test(String(body.stepId ?? ""))) throw new HttpError(400, "stepId is not valid.");
            const progress = await setStepDone(state.guideId, body.stepId, body.done === true);
            return sendJson(res, 200, { progress });
        }
        if (pathname === "/api/ask") {
            const guide = await loadGuide(state.guideId);
            if (!guide) throw new HttpError(404, "The guide does not exist.");
            let prompt;
            try {
                prompt = buildAskPrompt(guide, body);
            } catch (error) {
                if (error instanceof AskError) throw new HttpError(400, error.message);
                throw error;
            }
            await sendPrompt(prompt);
            return sendJson(res, 200, { sent: true });
        }
        if (pathname === "/api/open") {
            const url = githubUrl(body.url);
            if (!url) throw new HttpError(400, "Only https://github.com links can open.");
            await openUrl(url);
            return sendJson(res, 200, { opened: url });
        }
        throw new HttpError(404, "Not found.");
    }

    const server = createServer((req, res) => {
        handle(req, res).catch((error) => {
            if (res.headersSent) return res.end();
            sendJson(res, error instanceof HttpError ? error.status : 500, { message: error instanceof HttpError ? error.message : "The request failed." });
        });
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            resolve();
        });
    });
    port = server.address().port;

    return {
        url: `http://127.0.0.1:${port}/`,
        get guideId() {
            return state.guideId;
        },
        setGuideId(next) {
            state.guideId = next;
            broadcast("change", { section: null });
        },
        navigate(section, itemId) {
            broadcast("navigate", { section, itemId: itemId ?? null });
            return clients.size;
        },
        async close() {
            guideEvents.off("change", onChange);
            clearInterval(keepAlive);
            for (const client of clients) client.end();
            clients.clear();
            server.closeAllConnections?.();
            await new Promise((resolve) => server.close(() => resolve()));
        },
    };
}
