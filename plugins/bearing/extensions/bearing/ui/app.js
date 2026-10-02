// Canvas controller: loads the guide, follows live updates, routes between
// sections, and sends the canvas actions to the extension server.

import { h, icon } from "./dom.js";
import { renderMasthead, renderSection, renderTabs, statusOf, TABS, tabForSection } from "./sections.js";

const token = document.querySelector('meta[name="bearing-token"]')?.content ?? "";
const masthead = document.getElementById("masthead");
const tabsEl = document.getElementById("tabs");
const content = document.getElementById("content");
const toastEl = document.getElementById("toast");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
    tab: "welcome",
    mapFilter: "",
    conventionFilter: "all",
    dirToggles: new Map(),
    openPrs: new Set(),
};

const ctx = {
    guide: null,
    progress: { done: {} },
    state,
    go,
    ask,
    open: openLink,
    copy,
    setStep,
    refresh: () => render({ keepScroll: true }),
    fileUrl,
};

// ---------------------------------------------------------------------------
// Server calls

async function post(path, body) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Bearing-Token": token },
        body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `The request failed (${response.status}).`);
    return data;
}

async function loadGuide() {
    const response = await fetch("/api/guide", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "The guide could not be loaded.");
    ctx.guide = data.guide;
    ctx.progress = data.progress ?? { done: {} };
}

// ---------------------------------------------------------------------------
// Rendering

let toastTimer = null;
function toast(message, tone = "info") {
    clearTimeout(toastTimer);
    toastEl.replaceChildren(icon(tone === "error" ? "warn" : "check", 14), h("span", { text: message }));
    toastEl.dataset.tone = tone;
    toastEl.classList.add("is-visible");
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 3600);
}

function render({ keepScroll = false } = {}) {
    if (!ctx.guide) return;
    const active = document.activeElement;
    const focusId = active && active !== document.body && active.id ? active.id : null;
    const caret = focusId && active.tagName === "INPUT" && active.type !== "checkbox" ? active.selectionStart : null;
    const scrollTop = content.scrollTop;

    const repo = ctx.guide.repository ?? {};
    document.title = `${repo.fullName ?? repo.name ?? "Repository"} · Onboarding guide`;
    masthead.replaceChildren(...renderMasthead(ctx).filter(Boolean));
    tabsEl.replaceChildren(...renderTabs(ctx, state.tab));
    content.replaceChildren(renderSection(ctx, state.tab));
    content.scrollTop = keepScroll ? scrollTop : 0;

    if (focusId) {
        const next = document.getElementById(focusId);
        if (next) {
            next.focus({ preventScroll: true });
            if (caret !== null && typeof next.setSelectionRange === "function") next.setSelectionRange(caret, caret);
        }
    }
}

function showFatal(message) {
    masthead.replaceChildren(h("p", { class: "repo-title", text: "Onboarding guide" }));
    tabsEl.replaceChildren();
    content.replaceChildren(
        h("div", { class: "notice notice-warn", role: "alert" }, icon("warn", 16), h("div", null, h("p", { class: "notice-title", text: "The guide could not be loaded." }), h("p", { text: message }))),
    );
}

// ---------------------------------------------------------------------------
// Navigation

function parseHash() {
    const [tab, ...rest] = location.hash.replace(/^#\/?/, "").split("/");
    const item = rest.length ? decodeURIComponent(rest.join("/")) : null;
    return { tab: TABS.some((entry) => entry.id === tab) ? tab : "welcome", item };
}

function prepareTarget(tab, item) {
    if (!item || !ctx.guide) return;
    const sections = ctx.guide.sections;
    if (tab === "changes") state.openPrs.add(String(item));
    if (tab === "conventions") state.conventionFilter = "all";
    if (tab === "map") {
        state.mapFilter = "";
        const area = sections.map?.areas?.find?.((entry) => entry.id === item);
        if (area?.path?.includes("/")) state.dirToggles.set(area.path.split("/")[0], true);
    }
}

function highlight(item) {
    if (!item) return;
    const target = content.querySelector(`[data-item="${CSS.escape(String(item))}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "auto" : "smooth" });
    target.classList.remove("is-target");
    void target.offsetWidth;
    target.classList.add("is-target");
    setTimeout(() => target.classList.remove("is-target"), 2000);
}

function applyRoute({ focusPanel = false } = {}) {
    const { tab, item } = parseHash();
    const changedTab = tab !== state.tab;
    state.tab = tab;
    prepareTarget(tab, item);
    render({ keepScroll: !changedTab && !item });
    if (focusPanel && changedTab) content.focus({ preventScroll: true });
    highlight(item);
}

function go(tab, item) {
    const next = `#/${tab}${item ? `/${encodeURIComponent(item)}` : ""}`;
    if (location.hash === next) applyRoute();
    else location.hash = next;
}

window.addEventListener("hashchange", () => applyRoute({ focusPanel: true }));

tabsEl.addEventListener("keydown", (event) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === state.tab);
    const move = keys[event.key];
    const next = move === "first" ? 0 : move === "last" ? TABS.length - 1 : (index + move + TABS.length) % TABS.length;
    go(TABS[next].id);
    requestAnimationFrame(() => document.getElementById(`tab-${TABS[next].id}`)?.focus());
});

// ---------------------------------------------------------------------------
// Actions

function fileUrl(path, start, end) {
    const repo = ctx.guide?.repository;
    if (!repo?.url || !path) return null;
    const ref = repo.linkRef || repo.defaultBranch || "HEAD";
    const encoded = String(path).split("/").map(encodeURIComponent).join("/");
    const lines = start ? `#L${start}${end && end !== start ? `-L${end}` : ""}` : "";
    return `${repo.url}/blob/${encodeURIComponent(ref)}/${encoded}${lines}`;
}

async function copy(text, message = "Copied.") {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const area = h("textarea", { value: text, class: "sr-only" });
        document.body.append(area);
        area.select();
        document.execCommand("copy");
        area.remove();
    }
    toast(message);
}

async function openLink(url) {
    try {
        await post("/api/open", { url });
        toast("Opened in your browser.");
    } catch {
        await copy(url, "The browser did not open. The link is copied.");
    }
}

async function ask(section, itemId, question, button) {
    if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
    }
    try {
        await post("/api/ask", { section, itemId, question });
        toast("Sent to Copilot. The answer comes in the chat.");
        return true;
    } catch (error) {
        toast(error.message, "error");
        return false;
    } finally {
        if (button?.isConnected) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
        }
    }
}

async function setStep(stepId, done, input) {
    try {
        const { progress } = await post("/api/progress", { stepId, done });
        ctx.progress = progress;
        render({ keepScroll: true });
        if (done) {
            const steps = ctx.guide.sections.journey?.firstSteps ?? [];
            if (steps.length && steps.every((step) => progress.done[step.id])) toast("All first steps are done.");
        }
    } catch (error) {
        if (input) input.checked = !done;
        toast(error.message, "error");
    }
}

document.getElementById("askbar").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("ask-input");
    const question = input.value.trim();
    if (!question) {
        input.focus();
        return;
    }
    const section = TABS.find((tab) => tab.id === state.tab)?.section;
    if (await ask(section, null, question, event.submitter)) input.value = "";
});

// ---------------------------------------------------------------------------
// Live updates

let reloadTimer = null;
function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => {
        try {
            const before = TABS.map((tab) => statusOf(ctx.guide, tab.section));
            await loadGuide();
            render({ keepScroll: true });
            const readyNow = TABS.filter((tab, index) => before[index] !== "ready" && statusOf(ctx.guide, tab.section) === "ready");
            if (readyNow.length === 1) toast(`${readyNow[0].label} is ready.`);
            else if (readyNow.length > 1) toast(`${readyNow.length} sections are ready.`);
        } catch {
            // The next change event or reconnect tries again.
        }
    }, 150);
}

function listen() {
    const events = new EventSource("/events");
    events.addEventListener("change", scheduleReload);
    events.addEventListener("open", scheduleReload);
    events.addEventListener("navigate", (event) => {
        try {
            const { section, itemId } = JSON.parse(event.data);
            go(tabForSection(section), itemId ?? undefined);
        } catch {
            // Ignore bad events.
        }
    });
}

// ---------------------------------------------------------------------------
// Start

try {
    await loadGuide();
    applyRoute();
    listen();
} catch (error) {
    showFatal(error.message);
}
