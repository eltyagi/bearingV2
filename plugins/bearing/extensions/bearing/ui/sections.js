// Renders the masthead, the tabs, and the guide sections. Guide values are
// untrusted text: they reach the page only through the dom.js helpers.

import { formatNumber, fullDate, h, icon, paras, relativeTime, rich } from "./dom.js";

export const TABS = [
    { id: "welcome", label: "Welcome", section: "overview", title: "Welcome", lede: "What this project is, and the files to read first." },
    { id: "map", label: "Map", section: "map", title: "Where is what", lede: "Answers to common lookup questions, and the layout of the repository." },
    { id: "architecture", label: "Architecture", section: "architecture", title: "How it works", lede: "The main parts of the code, and how a request or command moves through them." },
    { id: "conventions", label: "Conventions", section: "conventions", title: "Coding conventions", lede: "The rules that the code follows. Documented rules come from config or docs. Observed rules repeat in three or more files." },
    { id: "workflow", label: "Workflow", section: "workflow", title: "Development workflow", lede: "How to set up, run, test, and contribute. Bearing does not run these commands. You run them." },
    { id: "changes", label: "Recent changes", section: "changes", title: "Recent pull requests", lede: "Walkthroughs of the latest pull requests merged into the default branch, newest first." },
    { id: "first-steps", label: "First steps", section: "journey", title: "Your first steps", lede: "A short path to your first contribution. Your progress is saved on this computer." },
];

const STATUS_LABELS = { ready: "Ready", pending: "Copilot is writing this section", unavailable: "Not available" };

const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572a5", Go: "#00add8", Rust: "#dea584", Java: "#b07219",
    Kotlin: "#a97bff", Ruby: "#701516", PHP: "#4f5d95", "C#": "#178600", "C++": "#f34b7d", C: "#555555", Swift: "#f05138",
    Dart: "#00b4ab", Shell: "#89e051", HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c", Vue: "#41b883", Svelte: "#ff3e00",
    Elixir: "#6e4a7e", Scala: "#c22d40", Dockerfile: "#384d54", Makefile: "#427819", Other: "#8b949e",
};

export function tabForSection(section) {
    return TABS.find((tab) => tab.id === section || tab.section === section)?.id ?? "welcome";
}

export function statusOf(guide, section) {
    return guide?.sections?.[section]?.status ?? "pending";
}

const list = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === "string" ? value : "");
const domId = (value) => String(value).replace(/[^A-Za-z0-9_-]/g, "-");

function textOf(item, ...keys) {
    if (typeof item === "string") return item;
    for (const key of keys) if (typeof item?.[key] === "string" && item[key].trim()) return item[key];
    return "";
}

// ---------------------------------------------------------------------------
// Shared pieces

function askButton(ctx, section, itemId, label) {
    return h(
        "button",
        { type: "button", class: "btn-link ask", on: { click: (event) => ctx.ask(section, itemId, null, event.currentTarget) } },
        icon("sparkle", 14),
        h("span", { text: label }),
    );
}

// A file or folder reference. It opens GitHub when the repository is on GitHub.
function fileLink(ctx, ref, { prUrl, label, plain = false } = {}) {
    const path = typeof ref === "string" ? ref : ref?.path;
    if (typeof path !== "string" || !path) return null;
    const start = Number.isInteger(ref?.startLine) ? ref.startLine : null;
    const end = Number.isInteger(ref?.endLine) ? ref.endLine : null;
    const range = start ? (end && end !== start ? `:${start}–${end}` : `:${start}`) : "";
    const display = label ?? `${path}${range}`;
    const url = prUrl ? `${prUrl}/files` : ctx.fileUrl(path, start, end);
    const className = plain ? "path-link" : "ref";
    if (!url) return h("code", { class: className, text: display });
    return h(
        "button",
        { type: "button", class: className, title: `Open ${path} on GitHub`, on: { click: () => ctx.open(url) } },
        h("span", { text: display }),
        icon("external", 11),
    );
}

function refList(ctx, refs, options) {
    const links = list(refs).map((ref) => fileLink(ctx, ref, options)).filter(Boolean);
    return links.length ? h("div", { class: "refs" }, links) : null;
}

function group(title, note, ...children) {
    return h("section", { class: "group" }, h("div", { class: "group-head" }, h("h2", { text: title }), note ? h("span", { class: "group-note", text: note }) : null), children);
}

function tag(label, tone) {
    return h("span", { class: tone ? `tag tag-${tone}` : "tag", text: label });
}

function emptyNote(message) {
    return h("p", { class: "empty", text: message });
}

function pendingBlock(message) {
    return h(
        "div",
        { class: "pending", role: "status" },
        h("p", { class: "pending-text" }, h("span", { class: "live-dot", "aria-hidden": "true" }), h("span", { text: message })),
        h("div", { class: "skeleton", "aria-hidden": "true" }, [92, 74, 86, 58].map((width) => h("span", { style: { width: `${width}%` } }))),
    );
}

function unavailableBlock(reason) {
    return h(
        "div",
        { class: "notice notice-warn", role: "note" },
        icon("warn", 16),
        h("div", null, h("p", { class: "notice-title", text: "This part is not available." }), h("p", { text: reason || "No reason was given." })),
    );
}

// Returns a pending or unavailable block, or null when the section is ready.
function sectionGate(ctx, section, pendingMessage) {
    const data = ctx.guide.sections?.[section];
    if (data?.status === "unavailable") return unavailableBlock(data.reason);
    if (data?.status !== "ready") return pendingBlock(pendingMessage ?? "Copilot is reading the repository to write this part. It shows here when it is ready.");
    return null;
}

function codeBlock(snippet) {
    return h("pre", { class: "code" }, h("code", { text: snippet }));
}

function diffBlock(excerpt) {
    return h(
        "pre",
        { class: "code diff" },
        text(excerpt)
            .split("\n")
            .map((line) => h("span", { class: line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : line.startsWith("@@") ? "hunk" : null, text: line || " " })),
    );
}

function commandLine(ctx, command) {
    return h(
        "div",
        { class: "cmd" },
        h("code", { text: command }),
        h("button", { type: "button", class: "icon-btn", title: "Copy the command", "aria-label": `Copy ${command}`, on: { click: () => ctx.copy(command, "Command copied.") } }, icon("copy", 14)),
    );
}

function diffstat(additions, deletions) {
    return h("span", { class: "diffstat" }, h("span", { class: "add", text: `+${formatNumber(additions ?? 0)}` }), h("span", { class: "del", text: `−${formatNumber(deletions ?? 0)}` }));
}

// ---------------------------------------------------------------------------
// Masthead and tabs

export function renderMasthead(ctx) {
    const guide = ctx.guide;
    const repo = guide.repository ?? {};
    const [owner, name] = repo.fullName ? repo.fullName.split("/") : [null, repo.name ?? "Repository"];
    const ready = TABS.filter((tab) => statusOf(guide, tab.section) === "ready").length;
    const working = TABS.some((tab) => statusOf(guide, tab.section) === "pending");
    const overview = guide.sections?.overview;
    const summary = overview?.status === "ready" && overview.summary ? overview.summary : "Copilot is building this guide. Each section shows here when it is ready.";

    return [
        h(
            "div",
            { class: "repo-row" },
            icon("repo", 18),
            h("p", { class: "repo-title" }, owner ? h("span", { class: "repo-owner", text: `${owner} / ` }) : null, h("span", { text: name })),
            repo.url
                ? h("button", { type: "button", class: "icon-btn", title: "Open the repository on GitHub", "aria-label": "Open the repository on GitHub", on: { click: () => ctx.open(repo.url) } }, icon("external", 14))
                : null,
            h(
                "p",
                { class: working ? "build-status is-working" : "build-status" },
                working ? h("span", { class: "live-dot", "aria-hidden": "true" }) : icon("check", 14),
                h("span", { text: `${ready} of ${TABS.length} sections ready` }),
            ),
        ),
        h("p", { class: "repo-summary" }, rich(summary)),
        metaRow(ctx),
        languageBar(guide.scan?.languages),
    ];
}

function languageColor(entry) {
    return LANGUAGE_COLORS[entry.name] ?? LANGUAGE_COLORS.Other;
}

function metaRow(ctx) {
    const { repository: repo = {}, scan = {} } = ctx.guide;
    const items = [];
    const branch = repo.headBranch ?? repo.defaultBranch;
    if (branch) items.push(h("li", null, icon("branch", 13), h("span", { text: `${branch}${repo.headCommit ? ` @ ${repo.headCommit.slice(0, 7)}` : ""}` })));
    const languages = list(scan.languages).filter((entry) => entry?.percent > 0).slice(0, 3);
    if (languages.length) {
        items.push(
            h("li", { title: languages.map((entry) => `${entry.name} ${entry.percent}%`).join(", ") },
                ...languages.flatMap((entry, index) => [
                    index ? h("span", { "aria-hidden": "true", text: "·" }) : null,
                    h("span", { class: "swatch", style: { background: languageColor(entry) } }),
                    h("span", { text: languages.length === 1 ? entry.name : `${entry.name} ${entry.percent}%` }),
                ])),
        );
    }
    if (scan.size) items.push(h("li", null, icon("file", 13), h("span", { text: `${formatNumber(scan.size.trackedFiles)} files${scan.size.lines ? `, ${formatNumber(scan.size.lines)} lines` : ""}` })));
    if (scan.hotspots?.lastCommitAt) items.push(h("li", { title: fullDate(scan.hotspots.lastCommitAt) }, icon("clock", 13), h("span", { text: `Last commit ${relativeTime(scan.hotspots.lastCommitAt)}` })));
    if (ctx.guide.updatedAt) items.push(h("li", { title: fullDate(ctx.guide.updatedAt) }, icon("sparkle", 13), h("span", { text: `Guide updated ${relativeTime(ctx.guide.updatedAt)}` })));
    return h("ul", { class: "meta", "aria-label": "Repository facts" }, items);
}

// Only for two or more languages: one language needs no bar.
function languageBar(languages) {
    const items = list(languages).filter((entry) => entry?.percent > 0);
    if (items.length < 2) return null;
    return h(
        "div",
        { class: "langbar", role: "img", "aria-label": `Languages: ${items.map((entry) => `${entry.name} ${entry.percent}%`).join(", ")}` },
        items.map((entry) => h("span", { title: `${entry.name} ${entry.percent}%`, style: { width: `${entry.percent}%`, background: languageColor(entry) } })),
    );
}

export function renderTabs(ctx, current) {
    return TABS.map((tab) => {
        const status = statusOf(ctx.guide, tab.section);
        const selected = tab.id === current;
        return h(
            "button",
            {
                type: "button",
                role: "tab",
                id: `tab-${tab.id}`,
                class: "tab",
                "aria-selected": selected ? "true" : "false",
                "aria-controls": "content",
                tabIndex: selected ? 0 : -1,
                on: { click: () => ctx.go(tab.id) },
            },
            h("span", { text: tab.label }),
            h("span", { class: `dot dot-${status}`, title: STATUS_LABELS[status] }, h("span", { class: "sr-only", text: `(${STATUS_LABELS[status]})` })),
        );
    });
}

// ---------------------------------------------------------------------------
// Sections

export function renderSection(ctx, tabId) {
    const index = Math.max(0, TABS.findIndex((tab) => tab.id === tabId));
    const tab = TABS[index];
    const ready = statusOf(ctx.guide, tab.section) === "ready";
    return h(
        "article",
        { class: "section", role: "tabpanel", "aria-labelledby": `tab-${tab.id}` },
        h(
            "header",
            { class: "section-head" },
            h("div", { class: "section-title" }, h("h1", { text: tab.title }), ready ? askButton(ctx, tab.section, null, "Ask Copilot about this") : null),
            h("p", { class: "lede", text: tab.lede }),
        ),
        RENDERERS[tab.id](ctx),
        sectionNav(ctx, index),
    );
}

function sectionNav(ctx, index) {
    const previous = TABS[index - 1];
    const next = TABS[index + 1];
    return h(
        "nav",
        { class: "section-nav", "aria-label": "Guide steps" },
        previous ? h("button", { type: "button", class: "btn", on: { click: () => ctx.go(previous.id) } }, icon("arrow-left", 14), h("span", { text: previous.label })) : h("span"),
        next ? h("button", { type: "button", class: "btn", on: { click: () => ctx.go(next.id) } }, h("span", { text: `Next: ${next.label}` }), icon("arrow-right", 14)) : null,
    );
}

function renderWelcome(ctx) {
    const { sections } = ctx.guide;
    const overview = sections.overview ?? {};
    const journey = sections.journey ?? {};
    const welcome = journey.status === "ready" ? text(journey.welcome) : "";
    const parts = [];
    const gate = sectionGate(ctx, "overview");

    if (welcome) parts.push(h("div", { class: "lead" }, paras(welcome)));
    if (gate) {
        parts.push(gate);
    } else {
        if (list(overview.startHere).length) {
            parts.push(
                group(
                    "Start here",
                    "Read these files in this order.",
                    h(
                        "ol",
                        { class: "rows numbered" },
                        list(overview.startHere).map((item) =>
                            h(
                                "li",
                                { class: "row", "data-item": item.id },
                                h("div", { class: "row-main" }, fileLink(ctx, item), item.why ? h("p", null, rich(item.why)) : null),
                                askButton(ctx, "overview", item.id, "Guide me"),
                            ),
                        ),
                    ),
                ),
            );
        }
        // The masthead already shows the summary, so this group adds the purpose only.
        const about = paras(overview.purpose);
        if (about.length) parts.push(group("Why it exists", null, h("div", { class: "prose" }, about)));
        if (list(overview.stack).length) {
            parts.push(
                group(
                    "Tech stack",
                    null,
                    h("dl", { class: "pairs pairs-strong" }, list(overview.stack).map((item) => h("div", { class: "pair" }, h("dt", { text: textOf(item, "name") }), h("dd", null, rich(textOf(item, "role", "purpose")))))),
                ),
            );
        }
    }
    parts.push(group("At a glance", null, glance(ctx)));
    if (overview.status === "ready") parts.push(methodNote(ctx));
    return parts;
}

function glance(ctx) {
    const { repository = {}, scan = {}, sections } = ctx.guide;
    const facts = list(sections.overview?.facts)
        .filter((fact) => fact?.label && fact?.value !== undefined)
        .map((fact) => [String(fact.label), String(fact.value)]);
    if (scan.size) facts.push(["Tracked files", formatNumber(scan.size.trackedFiles)]);
    if (scan.size?.lines) facts.push(["Lines of code", formatNumber(scan.size.lines)]);
    if (list(scan.languages).length) facts.push(["Languages", scan.languages.slice(0, 3).map((entry) => `${entry.name} ${entry.percent}%`).join(", ")]);
    if (repository.defaultBranch) facts.push(["Default branch", repository.defaultBranch]);
    if (scan.hotspots?.lastCommitAt) facts.push(["Last commit", relativeTime(scan.hotspots.lastCommitAt)]);
    return h("dl", { class: "pairs" }, facts.map(([label, value]) => h("div", { class: "pair" }, h("dt", { text: label }), h("dd", { text: value }))));
}

function methodNote(ctx) {
    const method = ctx.guide.sections.overview?.method ?? {};
    const sentences = [
        method.semanticSearch === false
            ? "Copilot made this guide with local search and file reads."
            : "Copilot made this guide with the GitHub Copilot semantic index and file reads.",
    ];
    if (method.indexedCommit) sentences.push(`Index commit ${String(method.indexedCommit).slice(0, 12)}.`);
    sentences.push(`Generated ${relativeTime(ctx.guide.createdAt)}. Check important facts in the code.`);
    if (text(method.notes)) sentences.push(method.notes);
    return h("p", { class: "footnote" }, icon("info", 14), h("span", { text: sentences.join(" ") }));
}

function renderMap(ctx) {
    const map = ctx.guide.sections.map ?? {};
    const filter = ctx.state.mapFilter.trim().toLowerCase();
    const matches = (...values) => !filter || values.some((value) => text(value).toLowerCase().includes(filter));
    const parts = [
        h(
            "label",
            { class: "filter" },
            icon("search", 14),
            h("span", { class: "sr-only", text: "Filter the map" }),
            h("input", {
                id: "map-filter",
                type: "search",
                value: ctx.state.mapFilter,
                placeholder: "Filter by path or topic",
                on: {
                    input: (event) => {
                        ctx.state.mapFilter = event.target.value;
                        ctx.refresh();
                    },
                },
            }),
        ),
    ];

    const gate = sectionGate(ctx, "map", "Copilot is writing the answers and the area notes. The layout below comes from the scan.");
    if (gate) {
        parts.push(gate);
    } else {
        const lookups = list(map.lookups).filter((item) => matches(item.question, item.answer, ...list(item.refs).map((ref) => ref?.path)));
        parts.push(
            group(
                "Common questions",
                null,
                lookups.length
                    ? h(
                        "ul",
                        { class: "rows" },
                        lookups.map((item) =>
                            h(
                                "li",
                                { class: "row", "data-item": item.id },
                                h("div", { class: "row-main" }, h("h3", { text: item.question }), h("p", null, rich(item.answer)), refList(ctx, item.refs)),
                                askButton(ctx, "map", item.id, "Show me"),
                            ),
                        ),
                    )
                    : emptyNote(filter ? "No answers match the filter." : "Copilot did not record lookup answers."),
            ),
        );
    }

    parts.push(group("Layout", `${formatNumber(ctx.guide.scan?.size?.trackedFiles)} tracked files`, layoutTree(ctx, map.status === "ready" ? list(map.areas) : [], matches, Boolean(filter))));
    const hotspots = ctx.guide.scan?.hotspots;
    if (list(hotspots?.files).length) parts.push(group("Hotspots", `Most-changed files, ${hotspots.window}`, hotspotRows(ctx, hotspots.files, matches)));
    return parts;
}

function layoutTree(ctx, areas, matches, filtering) {
    const areaByPath = new Map(areas.map((area) => [text(area.path).replace(/\/+$/, ""), area]));
    const rows = [];
    for (const entry of list(ctx.guide.scan?.tree)) {
        const area = areaByPath.get(entry.path);
        const folders = new Map(list(entry.folders).map((folder) => [folder.path, folder.files]));
        const childPaths = new Set(folders.keys());
        for (const path of areaByPath.keys()) if (path.startsWith(`${entry.path}/`)) childPaths.add(path);
        const children = [...childPaths].sort().map((path) => ({
            path,
            type: folders.has(path) || !/\.[^/]+$/.test(path) ? "dir" : "file",
            files: folders.get(path),
            area: areaByPath.get(path),
        }));
        const selfMatch = matches(entry.path, area?.purpose);
        const visibleChildren = children.filter((child) => selfMatch || matches(child.path, child.area?.purpose));
        if (!selfMatch && !visibleChildren.length) continue;
        const expandable = entry.type === "dir" && children.length > 0;
        const toggled = ctx.state.dirToggles.get(entry.path);
        const open = expandable && visibleChildren.length > 0 && (filtering || (toggled ?? children.some((child) => child.area)));
        rows.push(treeRow(ctx, entry, area, { depth: 0, expandable, open }));
        if (open) for (const child of visibleChildren) rows.push(treeRow(ctx, child, child.area, { depth: 1 }));
    }
    const omitted = ctx.guide.scan?.treeOmitted;
    if (!filtering && omitted > 0) {
        rows.push(h("li", { class: "tree-row tree-more" }, h("span", { class: "toggle-space" }), h("span"), h("p", { class: "small muted", text: `${formatNumber(omitted)} more top-level entries are not shown.` })));
    }
    return rows.length ? h("ul", { class: "tree" }, rows) : emptyNote("No paths match the filter.");
}

function treeRow(ctx, entry, area, { depth, expandable = false, open = false }) {
    const toggle = expandable
        ? h(
            "button",
            {
                type: "button",
                id: `toggle-${domId(entry.path)}`,
                class: "icon-btn",
                "aria-expanded": open ? "true" : "false",
                "aria-label": `${open ? "Collapse" : "Expand"} ${entry.path}`,
                on: {
                    click: () => {
                        ctx.state.dirToggles.set(entry.path, !open);
                        ctx.refresh();
                    },
                },
            },
            icon(open ? "chevron-down" : "chevron-right", 14),
        )
        : h("span", { class: "toggle-space", "aria-hidden": "true" });
    const label = depth ? entry.path.slice(entry.path.indexOf("/") + 1) : entry.path;
    return h(
        "li",
        { class: `tree-row depth-${depth}`, "data-item": area?.id },
        toggle,
        h("span", { class: "tree-icon" }, icon(entry.type === "dir" ? "folder" : "file", 15)),
        h(
            "div",
            { class: "tree-main" },
            h(
                "div",
                { class: "tree-line" },
                fileLink(ctx, entry.path, { label, plain: true }),
                entry.files ? h("span", { class: "count", text: `${formatNumber(entry.files)} ${entry.files === 1 ? "file" : "files"}` }) : null,
            ),
            area?.purpose ? h("p", null, rich(area.purpose)) : null,
            area ? refList(ctx, area.refs) : null,
        ),
        area ? askButton(ctx, "map", area.id, "Explain") : null,
    );
}

function hotspotRows(ctx, files, matches) {
    const shown = files.filter((file) => matches(file.path));
    if (!shown.length) return emptyNote("No hotspots match the filter.");
    const max = Math.max(...shown.map((file) => file.commits), 1);
    return h(
        "ul",
        { class: "hotspots" },
        shown.map((file) =>
            h(
                "li",
                { class: "hot-row" },
                fileLink(ctx, file.path, { plain: true }),
                h("span", { class: "meter", "aria-hidden": "true" }, h("span", { style: { width: `${Math.max(6, Math.round((file.commits / max) * 100))}%` } })),
                h("span", { class: "count", text: `${file.commits} commits` }),
            ),
        ),
    );
}

function renderArchitecture(ctx) {
    const gate = sectionGate(ctx, "architecture");
    if (gate) return [gate];
    const arch = ctx.guide.sections.architecture;
    const parts = [h("div", { class: "lead" }, paras(arch.summary))];

    if (list(arch.components).length) {
        parts.push(
            group(
                "Components",
                null,
                h(
                    "ul",
                    { class: "rows" },
                    list(arch.components).map((component) =>
                        h(
                            "li",
                            { class: "row", "data-item": component.id },
                            h(
                                "div",
                                { class: "row-main" },
                                h("h3", { text: component.name }),
                                h("p", null, rich(textOf(component, "responsibility", "description", "purpose"))),
                                refList(ctx, [...list(component.paths), ...list(component.refs)]),
                                list(component.dependsOn).length ? h("p", { class: "small muted", text: `Uses ${component.dependsOn.join(", ")}` }) : null,
                            ),
                            askButton(ctx, "architecture", component.id, "Explain"),
                        ),
                    ),
                ),
            ),
        );
    }

    if (list(arch.flows).length) {
        parts.push(
            group(
                "Key flows",
                null,
                list(arch.flows).map((flow) =>
                    h(
                        "div",
                        { class: "flow", "data-item": flow.id },
                        h("div", { class: "flow-head" }, h("h3", { text: flow.name }), askButton(ctx, "architecture", flow.id, "Trace in code")),
                        flow.trigger ? h("p", { class: "muted" }, rich(flow.trigger)) : null,
                        h(
                            "ol",
                            { class: "steps" },
                            list(flow.steps).map((step) => h("li", { class: "step" }, h("p", null, rich(textOf(step, "text", "description", "step"))), refList(ctx, step?.ref ? [step.ref] : step?.refs))),
                        ),
                    ),
                ),
            ),
        );
    }

    if (list(arch.decisions).length) {
        parts.push(
            group(
                "Design decisions",
                null,
                h(
                    "ul",
                    { class: "rows" },
                    list(arch.decisions).map((decision) =>
                        h(
                            "li",
                            { class: "row", "data-item": decision.id },
                            h("div", { class: "row-main" }, h("h3", { text: decision.title }), h("p", null, rich(textOf(decision, "detail", "decision", "rationale"))), refList(ctx, decision.refs)),
                            askButton(ctx, "architecture", decision.id, "Why?"),
                        ),
                    ),
                ),
            ),
        );
    }
    return parts;
}

function renderConventions(ctx) {
    const gate = sectionGate(ctx, "conventions");
    if (gate) return [gate];
    const items = list(ctx.guide.sections.conventions.conventions);
    const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
    const filter = categories.includes(ctx.state.conventionFilter) ? ctx.state.conventionFilter : "all";
    const shown = filter === "all" ? items : items.filter((item) => item.category === filter);
    const parts = [];

    if (categories.length > 1) {
        parts.push(
            h(
                "div",
                { class: "segmented", role: "group", "aria-label": "Show conventions by category" },
                ["all", ...categories].map((category) =>
                    h(
                        "button",
                        {
                            type: "button",
                            id: `filter-${domId(category)}`,
                            "aria-pressed": filter === category ? "true" : "false",
                            on: {
                                click: () => {
                                    ctx.state.conventionFilter = category;
                                    ctx.refresh();
                                },
                            },
                        },
                        h("span", { text: category === "all" ? "All" : category }),
                        h("span", { class: "segment-count", text: String(category === "all" ? items.length : items.filter((item) => item.category === category).length) }),
                    ),
                ),
            ),
        );
    }
    parts.push(shown.length ? h("ul", { class: "rows" }, shown.map((item) => conventionRow(ctx, item))) : emptyNote("Copilot did not record conventions in this category."));
    return parts;
}

function conventionRow(ctx, item) {
    const documented = item.source === "documented";
    return h(
        "li",
        { class: "row", "data-item": item.id },
        h(
            "div",
            { class: "row-main" },
            h("div", { class: "title-line" }, h("h3", { text: item.title }), tag(documented ? "documented" : "observed", documented ? "ok" : null), item.category ? tag(item.category) : null),
            h("p", null, rich(textOf(item, "rule", "guidance"))),
            item.example?.snippet
                ? h("figure", { class: "example" }, h("figcaption", null, h("span", { text: "Example" }), item.example.path ? fileLink(ctx, item.example) : null), codeBlock(item.example.snippet))
                : null,
            list(item.evidence).length ? h("div", { class: "evidence" }, h("span", { class: "small muted", text: "Evidence" }), refList(ctx, item.evidence)) : null,
        ),
        askButton(ctx, "conventions", item.id, "Show examples"),
    );
}

function renderWorkflow(ctx) {
    const gate = sectionGate(ctx, "workflow");
    if (gate) return [gate];
    const workflow = ctx.guide.sections.workflow;
    const parts = [];

    if (list(workflow.setup).length) {
        parts.push(
            group(
                "Set up",
                null,
                h("ol", { class: "steps" }, list(workflow.setup).map((step) => h("li", { class: "step" }, h("p", null, rich(textOf(step, "text", "step", "description"))), step?.command ? commandLine(ctx, step.command) : null))),
            ),
        );
    }
    if (list(workflow.commands).length) {
        parts.push(
            group(
                "Commands",
                null,
                h(
                    "ul",
                    { class: "rows" },
                    list(workflow.commands).map((command) =>
                        h(
                            "li",
                            { class: "row", "data-item": command.id },
                            h(
                                "div",
                                { class: "row-main" },
                                commandLine(ctx, command.command),
                                h("p", { class: "with-tag" }, command.kind ? tag(command.kind) : null, h("span", null, rich(command.purpose))),
                                command.source?.path ? refList(ctx, [command.source]) : null,
                            ),
                            askButton(ctx, "workflow", command.id, "Explain"),
                        ),
                    ),
                ),
            ),
        );
    }
    if (list(workflow.ci).length) {
        parts.push(
            group(
                "Continuous integration",
                null,
                h(
                    "ul",
                    { class: "rows" },
                    list(workflow.ci).map((job) =>
                        h("li", { class: "row" }, h("div", { class: "row-main" }, h("h3", { text: textOf(job, "name") || text(job?.path) }), job?.runs ? h("p", null, rich(job.runs)) : null, job?.path ? refList(ctx, [job]) : null)),
                    ),
                ),
            ),
        );
    }
    if (list(workflow.contributing).length) {
        parts.push(
            group(
                "Contributing",
                null,
                h("ul", { class: "bullets" }, list(workflow.contributing).map((item) => h("li", null, rich(textOf(item, "text", "rule")), typeof item === "object" ? refList(ctx, item?.refs) : null))),
            ),
        );
    }
    return parts.length ? parts : [emptyNote("Copilot did not record workflow details.")];
}

function renderChanges(ctx) {
    const changes = ctx.guide.sections.changes ?? {};
    if (changes.status === "unavailable") return [unavailableBlock(changes.reason)];
    const pullRequests = list(changes.pullRequests);
    const parts = [];
    if (changes.summary) parts.push(h("div", { class: "lead" }, paras(changes.summary)));
    if (!pullRequests.length) {
        parts.push(changes.status === "ready" ? emptyNote("No merged pull requests were found.") : pendingBlock("Copilot is finding the latest merged pull requests."));
        return parts;
    }
    parts.push(h("ol", { class: "timeline" }, pullRequests.map((pr) => pullRequestRow(ctx, pr))));
    if (changes.limitations) parts.push(h("p", { class: "footnote" }, icon("info", 14), h("span", { text: changes.limitations })));
    return parts;
}

function pullRequestRow(ctx, pr) {
    const id = String(pr.number);
    const ready = pr.status === "ready";
    const open = ready && ctx.state.openPrs.has(id);
    const detailsId = `pr-${domId(id)}-walkthrough`;
    const kind = text(pr.kind);
    const meta = [
        kind ? tag(kind) : null,
        ...list(pr.labels)
            .filter((label) => typeof label === "string" && label.toLowerCase() !== kind.toLowerCase())
            .slice(0, 3)
            .map((label) => tag(label)),
        pr.author ? h("span", { text: `@${pr.author}` }) : null,
        pr.mergedAt ? h("span", { title: fullDate(pr.mergedAt), text: `merged ${relativeTime(pr.mergedAt)}` }) : null,
        Number.isFinite(pr.additions) ? diffstat(pr.additions, pr.deletions) : null,
        Number.isFinite(pr.changedFiles) ? h("span", { text: `${pr.changedFiles} ${pr.changedFiles === 1 ? "file" : "files"}` }) : null,
    ];
    return h(
        "li",
        { class: ready ? "pr" : "pr is-pending", "data-item": id },
        h("span", { class: "pr-icon" }, icon("merged", 16)),
        h(
            "div",
            { class: "pr-main" },
            h("h3", { class: "pr-title" }, h("span", { class: "pr-number", text: `#${pr.number}` }), h("span", { text: pr.title ?? `Pull request #${pr.number}` })),
            h("div", { class: "pr-meta" }, meta),
            ready && pr.summary ? h("p", { class: "pr-summary" }, rich(pr.summary)) : null,
            ready
                ? h(
                    "button",
                    {
                        type: "button",
                        id: `toggle-pr-${domId(id)}`,
                        class: "btn-link",
                        "aria-expanded": open ? "true" : "false",
                        "aria-controls": detailsId,
                        on: {
                            click: () => {
                                if (open) ctx.state.openPrs.delete(id);
                                else ctx.state.openPrs.add(id);
                                ctx.refresh();
                            },
                        },
                    },
                    icon(open ? "chevron-down" : "chevron-right", 14),
                    h("span", { text: open ? "Hide the walkthrough" : "Show the walkthrough" }),
                )
                : h("p", { class: "pending-text small" }, h("span", { class: "live-dot", "aria-hidden": "true" }), h("span", { text: "Copilot is writing the walkthrough." })),
            open ? pullRequestDetails(ctx, pr, detailsId) : null,
        ),
    );
}

function pullRequestDetails(ctx, pr, id) {
    const detail = (title, ...children) => h("div", { class: "detail" }, h("h4", { text: title }), children);
    return h(
        "div",
        { class: "pr-details", id },
        pr.why ? detail("Why", paras(pr.why)) : null,
        list(pr.walkthrough).length
            ? detail(
                "Walkthrough",
                h(
                    "ol",
                    { class: "steps" },
                    list(pr.walkthrough).map((step) =>
                        h(
                            "li",
                            { class: "step" },
                            h("p", { class: "step-title", text: textOf(step, "title") }),
                            step?.detail ? h("p", null, rich(step.detail)) : null,
                            refList(ctx, step?.refs, { prUrl: pr.url }),
                            step?.excerpt ? diffBlock(step.excerpt) : null,
                        ),
                    ),
                ),
            )
            : null,
        pr.tests ? detail("Tests", paras(pr.tests)) : null,
        list(pr.reviewNotes).length ? detail("From the review", h("ul", { class: "bullets" }, list(pr.reviewNotes).map((note) => h("li", null, rich(textOf(note, "text", "note")))))) : null,
        list(pr.teaches).length
            ? h("div", { class: "detail" }, h("h4", { class: "with-icon" }, icon("bulb", 14), h("span", { text: "What this teaches" })), h("ul", { class: "bullets" }, list(pr.teaches).map((lesson) => h("li", null, rich(textOf(lesson, "text"))))))
            : null,
        list(pr.files).length
            ? h(
                "details",
                { class: "files" },
                h("summary", { text: `Files changed (${pr.files.length})` }),
                h("ul", null, list(pr.files).map((file) => h("li", null, h("code", { text: file.path }), diffstat(file.additions, file.deletions)))),
            )
            : null,
        h(
            "div",
            { class: "actions" },
            pr.url ? h("button", { type: "button", class: "btn", on: { click: () => ctx.open(pr.url) } }, icon("external", 14), h("span", { text: "Open on GitHub" })) : null,
            askButton(ctx, "changes", String(pr.number), "Go deeper with Copilot"),
        ),
    );
}

function renderFirstSteps(ctx) {
    const gate = sectionGate(ctx, "journey", "Copilot writes your first steps after the other sections are ready.");
    if (gate) return [gate];
    const journey = ctx.guide.sections.journey;
    const steps = list(journey.firstSteps);
    const done = ctx.progress?.done ?? {};
    const count = steps.filter((step) => done[step.id]).length;
    const parts = [
        h(
            "div",
            { class: "progress" },
            h(
                "div",
                { class: "progress-track", role: "progressbar", "aria-label": "First steps done", "aria-valuemin": "0", "aria-valuemax": String(steps.length), "aria-valuenow": String(count) },
                h("span", { style: { transform: `scaleX(${steps.length ? count / steps.length : 0})` } }),
            ),
            h("span", { class: "small", text: steps.length && count === steps.length ? "All steps are done." : `${count} of ${steps.length} done` }),
        ),
        h("ol", { class: "checklist" }, steps.map((step) => checklistItem(ctx, step, Boolean(done[step.id])))),
    ];
    if (list(journey.gaps).length) parts.push(group("What the guide could not confirm", null, h("ul", { class: "bullets" }, list(journey.gaps).map((gap) => h("li", null, rich(textOf(gap, "text")))))));
    return parts;
}

function checklistItem(ctx, step, isDone) {
    const inputId = `step-${domId(step.id)}`;
    const targetTab = step.target?.section ? TABS.find((tab) => tab.id === tabForSection(step.target.section)) : null;
    return h(
        "li",
        { class: isDone ? "check is-done" : "check", "data-item": step.id },
        h("input", { type: "checkbox", id: inputId, checked: isDone, on: { change: (event) => ctx.setStep(step.id, event.target.checked, event.target) } }),
        h(
            "div",
            { class: "check-main" },
            h("label", { for: inputId, text: step.title }),
            step.detail ? h("p", null, rich(step.detail)) : null,
            h(
                "div",
                { class: "actions" },
                targetTab
                    ? h("button", { type: "button", class: "btn-link", on: { click: () => ctx.go(targetTab.id, step.target.item) } }, h("span", { text: `Open ${targetTab.label}` }), icon("arrow-right", 14))
                    : null,
                askButton(ctx, "journey", step.id, "Help me with this"),
            ),
        ),
    );
}

const RENDERERS = {
    welcome: renderWelcome,
    map: renderMap,
    architecture: renderArchitecture,
    conventions: renderConventions,
    workflow: renderWorkflow,
    changes: renderChanges,
    "first-steps": renderFirstSteps,
};
