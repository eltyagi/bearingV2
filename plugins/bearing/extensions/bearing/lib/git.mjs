// Read-only git helpers.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
// Never prompt for credentials and never take optional locks.
const GIT_ENV = { GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };

export class BearingError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "BearingError";
        this.code = code;
    }
}

export async function git(cwd, args, { allowFailure = false } = {}) {
    try {
        const { stdout } = await execFileAsync("git", ["-C", cwd, "-c", "core.quotePath=false", ...args], {
            env: { ...process.env, ...GIT_ENV },
            maxBuffer: 32 * 1024 * 1024,
            timeout: 30_000,
        });
        return stdout;
    } catch (error) {
        if (allowFailure) return null;
        const detail = String(error.stderr || error.message).trim().split("\n")[0];
        throw new BearingError("git_failed", `git ${args[0]} failed: ${detail}`);
    }
}

async function gitLine(cwd, args) {
    return (await git(cwd, args, { allowFailure: true }))?.trim() || null;
}

export function parseGitHubRemote(url) {
    if (typeof url !== "string") return null;
    const match = /^(?:https?:\/\/(?:[^@/]+@)?(?:www\.)?github\.com\/|(?:ssh:\/\/)?git@github\.com[:/])([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(
        url.trim(),
    );
    return match ? { owner: match[1], name: match[2] } : null;
}

export async function readRepository(path) {
    const root = await gitLine(path, ["rev-parse", "--show-toplevel"]);
    if (!root) throw new BearingError("not_a_git_repository", `${path} is not inside a git repository.`);

    const remote = parseGitHubRemote(await gitLine(root, ["remote", "get-url", "origin"]));
    const headCommit = await gitLine(root, ["rev-parse", "--verify", "--quiet", "HEAD"]);
    const headBranch = await gitLine(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);

    let defaultBranch = (await gitLine(root, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]))?.replace(/^origin\//, "") ?? null;
    if (!defaultBranch) {
        for (const candidate of ["main", "master"]) {
            if (await gitLine(root, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${candidate}`])) {
                defaultBranch = candidate;
                break;
            }
        }
    }
    defaultBranch ??= headBranch;
    const defaultRef = defaultBranch
        ? (await gitLine(root, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${defaultBranch}`]))
            ? `origin/${defaultBranch}`
            : defaultBranch
        : null;
    const defaultBranchCommit = defaultRef ? await gitLine(root, ["rev-parse", "--verify", "--quiet", defaultRef]) : null;

    // Links can point at HEAD only when a remote branch contains it.
    const headIsPushed = headCommit
        ? Boolean(await gitLine(root, ["for-each-ref", "--contains", headCommit, "--count=1", "--format=%(refname)", "refs/remotes"]))
        : false;

    return {
        root,
        owner: remote?.owner ?? null,
        name: remote?.name ?? null,
        headBranch,
        headCommit,
        defaultBranch,
        defaultRef: defaultBranchCommit ? defaultRef : null,
        defaultBranchCommit,
        linkRef: headIsPushed ? headCommit : defaultBranch,
    };
}

export async function listTrackedFiles(root) {
    return (await git(root, ["ls-files", "-z"])).split("\0").filter(Boolean);
}
