import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const home = await mkdtemp(join(tmpdir(), "bearing-canvas-"));
process.env.COPILOT_HOME = home;

const { startCanvasServer, githubUrl } = await import("../plugins/bearing/extensions/bearing/lib/canvas-server.mjs");
const { createGuide, updateGuide } = await import("../plugins/bearing/extensions/bearing/lib/guide-store.mjs");
const { applySection } = await import("../plugins/bearing/extensions/bearing/lib/sections.mjs");

await createGuide({ repository: { guideId: "acme__demo", fullName: "acme/demo", rootPath: "/tmp/demo" }, scan: {} });
await updateGuide("acme__demo", "conventions", (guide) =>
    applySection(guide, "conventions", { conventions: [{ id: "single-quotes", title: "Single quotes", rule: "Use single quotes." }] }),
);

const prompts = [];
const opened = [];
const server = await startCanvasServer({ guideId: "acme__demo", sendPrompt: async (prompt) => prompts.push(prompt), openUrl: async (url) => opened.push(url) });
const { port } = new URL(server.url);

test.after(async () => {
    await server.close();
    await rm(home, { recursive: true, force: true });
});

function call(method, path, { host = `127.0.0.1:${port}`, token, body } = {}) {
    return new Promise((resolve, reject) => {
        const headers = { Host: host };
        if (token) headers["X-Bearing-Token"] = token;
        if (body !== undefined) headers["Content-Type"] = "application/json";
        const req = request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on("error", reject);
        req.end(body === undefined ? undefined : JSON.stringify(body));
    });
}

async function pageToken() {
    const page = await call("GET", "/");
    return /name="bearing-token" content="([a-f0-9]+)"/.exec(page.body)[1];
}

test("the page loads with a CSP and a token, and the guide is served", async () => {
    const page = await call("GET", "/");
    assert.equal(page.status, 200);
    assert.match(page.headers["content-security-policy"], /script-src 'self'/);
    assert.match(page.body, /name="bearing-token" content="[a-f0-9]{48}"/);
    const guide = JSON.parse((await call("GET", "/api/guide")).body);
    assert.equal(guide.guide.guideId, "acme__demo");
});

test("requests with another Host or without the token are rejected", async () => {
    assert.equal((await call("GET", "/", { host: "evil.example" })).status, 421);
    assert.equal((await call("POST", "/api/ask", { body: { question: "hi" } })).status, 403);
    assert.equal((await call("POST", "/api/ask", { token: "wrong", body: { question: "hi" } })).status, 403);
    assert.equal(prompts.length, 0);
});

test("Ask Copilot builds the prompt from the stored item", async () => {
    const token = await pageToken();
    const ok = await call("POST", "/api/ask", { token, body: { section: "conventions", itemId: "single-quotes" } });
    assert.equal(ok.status, 200);
    assert.match(prompts.at(-1), /convention "Single quotes"/);
    assert.match(prompts.at(-1), /<guide-reference>[\s\S]*Use single quotes\.[\s\S]*<\/guide-reference>/);
    assert.equal((await call("POST", "/api/ask", { token, body: { section: "conventions", itemId: "missing" } })).status, 400);
    assert.equal((await call("POST", "/api/ask", { token, body: { question: "x".repeat(1001) } })).status, 400);
});

test("progress is saved, and only GitHub links open", async () => {
    const token = await pageToken();
    const saved = JSON.parse((await call("POST", "/api/progress", { token, body: { stepId: "run-tests", done: true } })).body);
    assert.ok(saved.progress.done["run-tests"]);
    assert.equal((await call("POST", "/api/progress", { token, body: { stepId: "../x", done: true } })).status, 400);
    assert.equal((await call("POST", "/api/open", { token, body: { url: "https://github.com/acme/demo" } })).status, 200);
    assert.equal((await call("POST", "/api/open", { token, body: { url: "https://evil.example/x" } })).status, 400);
    assert.deepEqual(opened, ["https://github.com/acme/demo"]);
    assert.equal(githubUrl("javascript:alert(1)"), null);
    assert.equal(githubUrl("https://user:pw@github.com/x"), null);
});
