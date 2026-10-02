import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(relativePath) {
    return JSON.parse(await readFile(join(repoRoot, relativePath), "utf8"));
}

test("the marketplace lists the bearing plugin with a matching manifest", async () => {
    const marketplace = await readJson(".github/plugin/marketplace.json");
    const entry = marketplace.plugins.find((plugin) => plugin.name === "bearing");
    assert.ok(entry, "the marketplace must list the bearing plugin");

    const manifest = await readJson(join(entry.source, "plugin.json"));
    assert.equal(manifest.name, entry.name);
    assert.equal(manifest.version, entry.version);
    assert.equal(manifest.version, "2.0.0");
});

test("the plugin manifest paths exist", async () => {
    const pluginRoot = join(repoRoot, "plugins/bearing");
    const manifest = await readJson("plugins/bearing/plugin.json");
    await access(join(pluginRoot, manifest.agents));
    await access(join(pluginRoot, manifest.extensions, "bearing", "extension.mjs"));
});
