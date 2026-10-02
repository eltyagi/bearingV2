// Loads test/fixtures/sample-guide.json into the Bearing guide store for a
// clone of expressjs/cors, through the same tool handlers that the agents use.
// Usage: node test/fixtures/load-sample.mjs /path/to/cors

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listMergedPullRequestsTool, saveGuideSectionTool, scanRepositoryTool } from "../../plugins/bearing/extensions/bearing/lib/tools.mjs";

const rootPath = process.argv[2];
if (!rootPath) throw new Error("Usage: node test/fixtures/load-sample.mjs /path/to/cors");

const sample = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "sample-guide.json"), "utf8"));
const { guideId } = JSON.parse(await scanRepositoryTool.handler({ rootPath, reset: true }));
const save = async (section, data) => JSON.parse(await saveGuideSectionTool.handler({ guideId, section, data }));

for (const section of ["overview", "map", "architecture", "conventions", "workflow"]) {
    const result = await save(section, sample[section]);
    process.stdout.write(`${section}: ${result.warnings.length ? result.warnings.join("; ") : "ok"}\n`);
}
try {
    await listMergedPullRequestsTool.handler({ guideId });
} catch (error) {
    process.stdout.write(`The pull request list is not available (${error.message}). The sample walkthroughs have no GitHub facts.\n`);
}
for (const pr of sample.pullRequests) await save("pull-request", pr);
await save("changes", sample.changes);
await save("journey", sample.journey);
process.stdout.write(`Loaded the sample into guide ${guideId}.\n`);
