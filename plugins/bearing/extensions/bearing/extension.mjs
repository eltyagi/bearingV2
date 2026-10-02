// Bearing extension entry point: wiring only. The logic is in lib/.
//
// The canvas below is still the step 1 spike canvas. Step 5 replaces it.

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";
import { guideTools } from "./lib/tools.mjs";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_LOGGED_REQUESTS = 60;
const SPIKE_PROMPT = [
    "[Bearing spike] This prompt came from the bearing-guide canvas through session.send.",
    "Reply with one short sentence that confirms you received it. Do not take any other action.",
].join("\n");

const instances = new Map(); // instanceId -> { server, port, url, token, cspMode, report, requests }
let resolveSession;
const sessionReady = new Promise((resolve) => {
    resolveSession = resolve;
});

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);
}

function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

function sendJson(res, status, body) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
}

async function readBody(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw httpError(413, "The request body is too large.");
        chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        throw httpError(400, "The request body is not valid JSON.");
    }
}

function spikeHtml({ instanceId, guideId, token, cspMode }) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="bearing-token" content="${escapeHtml(token)}">
<meta name="bearing-csp" content="${escapeHtml(cspMode)}">
<title>Bearing onboarding guide</title>
<link rel="stylesheet" href="/spike.css">
<script type="module" src="/spike.js"></script>
</head>
<body>
<main>
  <h1>Bearing onboarding guide (spike)</h1>
  <p class="muted">Instance <code>${escapeHtml(instanceId)}</code>, guide <code>${escapeHtml(guideId ?? "none")}</code>, CSP <code>${escapeHtml(cspMode)}</code>.</p>
  <p><button id="ask" type="button">Send a test prompt to Copilot</button></p>
  <p id="status" role="status" aria-live="polite"></p>
  <p><a href="https://github.com/eltyagi/bearingV2" target="_blank" rel="noopener noreferrer">Open the bearingV2 repository on GitHub</a></p>
  <h2>Theme check</h2>
  <pre id="report">Collecting…</pre>
</main>
</body>
</html>`;
}

const SPIKE_CSS = `
body {
  margin: 0;
  padding: 16px;
  background: var(--background-color-default, #ffffff);
  color: var(--text-color-default, #1f2328);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--text-body-medium, 14px);
  line-height: var(--leading-body-medium, 20px);
}
h1 { font-size: 20px; margin: 0 0 8px; }
code, pre { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; }
pre {
  padding: 12px;
  border: 1px solid var(--border-color-default, #d0d7de);
  border-radius: 6px;
  overflow: auto;
  white-space: pre-wrap;
}
button { font: inherit; padding: 6px 12px; cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
.muted { color: var(--text-color-muted, #59636e); }
`;

const SPIKE_JS = `
const token = document.querySelector('meta[name="bearing-token"]').content;
const cspMode = document.querySelector('meta[name="bearing-csp"]').content;
const root = document.documentElement;
const violations = [];
const transport = [];
fetch("/api/ping?stage=script-start").catch((error) => transport.push("ping failed: " + error.message));
document.addEventListener("securitypolicyviolation", (event) => {
  violations.push({ directive: event.violatedDirective, blocked: event.blockedURI, sample: event.sample, source: event.sourceFile });
  scheduleReport();
});
const variableNames = [
  "--background-color-default", "--text-color-default", "--text-color-muted",
  "--border-color-default", "--color-focus-outline", "--font-sans", "--font-mono",
  "--text-body-medium", "--leading-body-medium", "--font-weight-semibold", "--true-color-green",
  "--true-color-red-muted", "--n-0", "--color-white",
];
const attributeNames = [
  "data-color-mode", "data-theme-tone", "data-visual-mode",
  "data-theme-source", "data-dark-theme", "data-light-theme",
];
function describeNode(node) {
  return node.tagName.toLowerCase() + (node.id ? "#" + node.id : "") + (node.getAttribute("data-theme") ? "[data-theme]" : "") +
    (node.tagName === "LINK" ? "(" + node.getAttribute("href") + ")" : "") + (node.tagName === "SCRIPT" ? "(" + (node.getAttribute("src") || "inline") + ")" : "");
}
function collect() {
  const style = getComputedStyle(root);
  return {
    cspMode,
    href: location.href,
    origin: String(window.origin),
    embedded: window.parent !== window,
    ancestorOrigins: location.ancestorOrigins ? Array.from(location.ancestorOrigins) : null,
    referrer: document.referrer,
    secureContext: window.isSecureContext,
    width: window.innerWidth,
    height: window.innerHeight,
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    attributes: Object.fromEntries(attributeNames.map((name) => [name, root.getAttribute(name)])),
    bodyAttributes: Object.fromEntries(attributeNames.map((name) => [name, document.body.getAttribute(name)])),
    rootClass: root.className,
    bodyClass: document.body.className,
    rootInlineStyleLength: (root.getAttribute("style") || "").length,
    variables: Object.fromEntries(variableNames.map((name) => [name, style.getPropertyValue(name).trim() || null])),
    headChildren: Array.from(document.head.children).map(describeNode),
    styleSheets: Array.from(document.styleSheets).map((sheet) => sheet.href || (sheet.ownerNode ? describeNode(sheet.ownerNode) : "constructed")),
    adoptedStyleSheets: document.adoptedStyleSheets ? document.adoptedStyleSheets.length : null,
    computedBackground: getComputedStyle(document.body).backgroundColor,
    computedColor: getComputedStyle(document.body).color,
    computedFont: getComputedStyle(document.body).fontFamily,
    violations,
    transport,
  };
}
async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Bearing-Token": token },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, body: await response.json() };
}
async function postSimple(path, body) {
  const response = await fetch(path + "?token=" + encodeURIComponent(token), {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status };
}
let timer = null;
function scheduleReport() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const report = collect();
    document.getElementById("report").textContent = JSON.stringify(report, null, 2);
    try {
      await postJson("/api/report", report);
    } catch (error) {
      transport.push("json post failed: " + error.message);
      try {
        await postSimple("/api/report", { ...report, transport });
      } catch (fallbackError) {
        transport.push("simple post failed: " + fallbackError.message);
      }
    }
  }, 250);
}
new MutationObserver(scheduleReport).observe(root, { attributes: true });
new MutationObserver(scheduleReport).observe(document.head, { childList: true });
window.addEventListener("resize", scheduleReport);
scheduleReport();
setTimeout(scheduleReport, 2500);
document.getElementById("ask").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.textContent = "Sending…";
  try {
    const result = await postJson("/api/ask", { kind: "spike" });
    status.textContent = result.ok ? "Sent to Copilot." : "Failed: " + result.body.message;
  } catch (error) {
    status.textContent = "Failed: " + error.message;
  }
});
`;

const STRICT_CSP = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "base-uri 'none'",
    "form-action 'none'",
].join("; ");

// Same as STRICT_CSP, but inline <style> elements are allowed so that the host
// can inject the app theme tokens. Scripts stay limited to same-origin files.
const THEME_CSP = STRICT_CSP.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");

function logRequest(entry, req, url) {
    entry.requests.push({
        at: new Date().toISOString(),
        method: req.method,
        path: url.pathname + (url.search ? url.search.replace(/token=[^&]+/, "token=…") : ""),
        host: req.headers.host ?? null,
        origin: req.headers.origin ?? null,
        secFetchSite: req.headers["sec-fetch-site"] ?? null,
        secFetchMode: req.headers["sec-fetch-mode"] ?? null,
        secFetchDest: req.headers["sec-fetch-dest"] ?? null,
        userAgent: (req.headers["user-agent"] ?? "").slice(0, 160),
    });
    if (entry.requests.length > MAX_LOGGED_REQUESTS) entry.requests.shift();
}

function sendAsset(res, type, body, cspMode) {
    const headers = {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
    };
    if (cspMode === "strict") headers["Content-Security-Policy"] = STRICT_CSP;
    if (cspMode === "theme") headers["Content-Security-Policy"] = THEME_CSP;
    res.writeHead(200, headers);
    res.end(body);
}

async function handleRequest(instanceId, req, res) {
    const entry = instances.get(instanceId);
    if (!entry) return sendJson(res, 410, { message: "The canvas is closed." });

    const host = req.headers.host ?? "";
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    logRequest(entry, req, url);
    if (host !== `127.0.0.1:${entry.port}` && host !== `localhost:${entry.port}`) {
        return sendJson(res, 421, { message: "Unexpected host." });
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204, { "Cache-Control": "no-store" });
        return res.end();
    }
    if (req.method === "GET" && url.pathname === "/") {
        return sendAsset(res, "text/html; charset=utf-8", spikeHtml({ instanceId, ...entry }), entry.cspMode);
    }
    if (req.method === "GET" && url.pathname === "/spike.css") {
        return sendAsset(res, "text/css; charset=utf-8", SPIKE_CSS, entry.cspMode);
    }
    if (req.method === "GET" && url.pathname === "/spike.js") {
        return sendAsset(res, "text/javascript; charset=utf-8", SPIKE_JS, entry.cspMode);
    }
    if (req.method === "GET" && url.pathname === "/api/ping") {
        res.writeHead(204, { "Cache-Control": "no-store" });
        return res.end();
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
        const token = req.headers["x-bearing-token"] ?? url.searchParams.get("token");
        if (token !== entry.token) {
            return sendJson(res, 403, { message: "The request token is not valid." });
        }
        const body = await readBody(req);
        if (url.pathname === "/api/report") {
            entry.report = { receivedAt: new Date().toISOString(), contentType: req.headers["content-type"] ?? null, ...body };
            return sendJson(res, 200, { ok: true });
        }
        if (url.pathname === "/api/ask") {
            const session = await sessionReady;
            await session.send({ prompt: SPIKE_PROMPT });
            return sendJson(res, 200, { ok: true });
        }
    }

    return sendJson(res, 404, { message: "Not found." });
}

async function startServer(instanceId) {
    const server = createServer((req, res) => {
        handleRequest(instanceId, req, res).catch((error) => {
            if (!res.headersSent) sendJson(res, error.status ?? 500, { message: error.message });
        });
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            resolve();
        });
    });
    const address = server.address();
    if (!address || typeof address === "string") {
        await new Promise((resolve) => server.close(() => resolve()));
        throw new CanvasError("bearing_server_failed", "The canvas server did not start.");
    }
    return { server, port: address.port, url: `http://127.0.0.1:${address.port}/` };
}

const guideCanvas = createCanvas({
    id: "bearing-guide",
    displayName: "Bearing onboarding guide",
    description: "Spike: Bearing onboarding guide canvas for a repository.",
    inputSchema: {
        type: "object",
        properties: {
            guideId: { type: "string", minLength: 1, maxLength: 200 },
            spikeCsp: { type: "string", enum: ["strict", "theme", "off"] },
        },
        additionalProperties: false,
    },
    actions: [
        {
            name: "get_spike_report",
            description: "Return the theme report and the request log of the canvas page.",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
            handler: async (ctx) => {
                const entry = instances.get(ctx.instanceId);
                if (!entry) throw new CanvasError("bearing_instance_not_found", "Open the canvas first.");
                return {
                    instanceId: ctx.instanceId,
                    url: entry.url,
                    cspMode: entry.cspMode,
                    openContext: entry.openContext ?? null,
                    report: entry.report ?? null,
                    requests: entry.requests,
                };
            },
        },
    ],
    open: async (ctx) => {
        let entry = instances.get(ctx.instanceId);
        if (!entry) {
            const server = await startServer(ctx.instanceId);
            entry = { ...server, token: randomBytes(24).toString("hex"), report: null, requests: [] };
            instances.set(ctx.instanceId, entry);
        }
        entry.guideId = ctx.input?.guideId ?? null;
        entry.cspMode = ["strict", "theme", "off"].includes(ctx.input?.spikeCsp) ? ctx.input.spikeCsp : "theme";
        entry.openContext = {
            extensionId: ctx.extensionId,
            host: ctx.host ?? null,
            session: ctx.session ?? null,
            openCount: (entry.openContext?.openCount ?? 0) + 1,
        };
        return { title: "Bearing onboarding guide", status: "Spike", url: entry.url };
    },
    onClose: async (ctx) => {
        const entry = instances.get(ctx.instanceId);
        if (!entry) return;
        instances.delete(ctx.instanceId);
        await new Promise((resolve) => entry.server.close(() => resolve()));
    },
});

const session = await joinSession({
    tools: guideTools,
    canvases: [guideCanvas],
});
resolveSession(session);
