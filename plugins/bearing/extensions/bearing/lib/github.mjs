// Read-only GitHub data through the gh CLI. The Copilot app bundles gh and
// sets GH_TOKEN for extensions. All arguments are fixed; nothing is written.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BearingError } from "./git.mjs";

const execFileAsync = promisify(execFile);
const GH_ENV = { GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1", NO_COLOR: "1" };
const BOT_LOGIN = /\[bot\]$|^app\/|^(?:dependabot|renovate|github-actions|greenkeeper|snyk-bot|depfu|imgbot|allcontributors|pre-commit-ci)$/i;
const SKIP_IN_DIFF = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Gemfile\.lock|composer\.lock|go\.sum)$|\.min\.(?:js|css)$|\.map$|\.snap$|(?:^|\/)(?:dist|vendor|node_modules)\//;

async function gh(args) {
    try {
        const { stdout } = await execFileAsync("gh", args, {
            env: { ...process.env, ...GH_ENV },
            maxBuffer: 32 * 1024 * 1024,
            timeout: 60_000,
        });
        return stdout;
    } catch (error) {
        if (error.code === "ENOENT") throw new BearingError("gh_not_found", "The GitHub CLI (gh) is not installed or not on the PATH.");
        const detail = String(error.stderr || error.message).trim().split("\n").filter(Boolean).slice(0, 2).join(" ");
        throw new BearingError("gh_failed", `gh ${args.slice(0, 2).join(" ")} failed: ${detail}`.slice(0, 400));
    }
}

function clip(text, max) {
    const value = String(text ?? "").replace(/\r\n/g, "\n").trim();
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const loginOf = (author) => author?.login?.replace(/^app\//, "") ?? null;

export function isBot(author) {
    return Boolean(author?.is_bot) || author?.type === "Bot" || BOT_LOGIN.test(String(author?.login ?? ""));
}

function prFacts(pr) {
    return {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        author: loginOf(pr.author),
        mergedAt: pr.mergedAt,
        labels: (pr.labels ?? []).map((label) => label.name).slice(0, 8),
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
    };
}

// gh lists by creation time, so check more pull requests and sort by merge time.
export async function listMergedPullRequests(fullName, baseBranch, { limit = 5, check = 30 } = {}) {
    const args = ["pr", "list", "--repo", fullName, "--state", "merged", "--limit", String(check), "--json", "number,title,author,mergedAt,url,labels,additions,deletions,changedFiles"];
    if (baseBranch) args.push("--base", baseBranch);
    const merged = JSON.parse(await gh(args))
        .filter((pr) => pr.mergedAt)
        .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
    const humans = merged.filter((pr) => !isBot(pr.author));
    return { checked: merged.length, botPullRequestsSkipped: merged.length - humans.length, pullRequests: humans.slice(0, limit).map(prFacts) };
}

// Keeps the diff small enough for a model: no lockfiles or generated files,
// at most maxLinesPerFile lines for each file and maxLines in total.
export function trimDiff(diff, { maxLinesPerFile = 120, maxLines = 500 } = {}) {
    const chunks = diff.split(/^(?=diff --git )/m).filter((chunk) => chunk.startsWith("diff --git "));
    const parts = [];
    const files = [];
    let used = 0;
    for (const chunk of chunks) {
        const path = /^diff --git a\/.+? b\/(.+)$/m.exec(chunk)?.[1] ?? "unknown";
        if (/^Binary files /m.test(chunk)) {
            files.push({ path, shown: "no", reason: "binary file" });
            continue;
        }
        if (SKIP_IN_DIFF.test(path)) {
            files.push({ path, shown: "no", reason: "lockfile or generated file" });
            continue;
        }
        const budget = Math.min(maxLinesPerFile, maxLines - used);
        if (budget < 10) {
            files.push({ path, shown: "no", reason: "diff size limit" });
            continue;
        }
        const lines = chunk.replace(/\n$/, "").split("\n");
        const kept = lines.slice(0, budget);
        used += kept.length;
        parts.push(kept.join("\n"));
        if (lines.length > kept.length) {
            parts.push(`[${lines.length - kept.length} more diff lines for ${path} are not shown]`);
            files.push({ path, shown: "partly" });
        } else {
            files.push({ path, shown: "yes" });
        }
    }
    return { text: parts.join("\n"), files };
}

export async function getPullRequest(fullName, number) {
    const fields = "number,title,author,body,mergedAt,url,labels,additions,deletions,changedFiles,baseRefName,headRefName,files,commits,reviews,comments,closingIssuesReferences";
    const pr = JSON.parse(await gh(["pr", "view", String(number), "--repo", fullName, "--json", fields]));

    let reviewComments = [];
    try {
        const raw = JSON.parse(await gh(["api", `repos/${fullName}/pulls/${number}/comments?per_page=50`]));
        reviewComments = raw
            .filter((comment) => !isBot(comment.user) && comment.body?.trim())
            .slice(0, 15)
            .map((comment) => ({ path: comment.path, line: comment.line ?? comment.original_line ?? null, author: comment.user?.login ?? null, body: clip(comment.body, 500) }));
    } catch {
        // Inline review comments are optional context.
    }

    let diff = { text: null, files: [] };
    let diffNote = null;
    try {
        diff = trimDiff(await gh(["pr", "diff", String(number), "--repo", fullName, "--color", "never"]));
    } catch (error) {
        diffNote = `The diff is not available: ${error.message}`;
    }

    return {
        ...prFacts(pr),
        baseRefName: pr.baseRefName,
        headRefName: pr.headRefName,
        body: clip(pr.body, 4000),
        files: (pr.files ?? []).slice(0, 60).map((file) => ({ path: file.path, additions: file.additions, deletions: file.deletions })),
        commits: (pr.commits ?? []).slice(0, 15).map((commit) => commit.messageHeadline),
        reviews: (pr.reviews ?? [])
            .filter((review) => review.body?.trim() && !isBot(review.author))
            .slice(0, 8)
            .map((review) => ({ author: loginOf(review.author), state: review.state, body: clip(review.body, 600) })),
        comments: (pr.comments ?? [])
            .filter((comment) => comment.body?.trim() && !isBot(comment.author))
            .slice(0, 8)
            .map((comment) => ({ author: loginOf(comment.author), body: clip(comment.body, 600) })),
        reviewComments,
        closingIssues: (pr.closingIssuesReferences ?? []).slice(0, 5).map((issue) => ({ number: issue.number, url: issue.url })),
        diff: diff.text,
        diffFiles: diff.files,
        diffNote,
    };
}
