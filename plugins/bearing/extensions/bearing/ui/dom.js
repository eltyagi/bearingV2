// Small DOM helpers. Guide data is untrusted text, so it goes into the page
// only through text nodes and attributes, never through HTML strings.

const SVG_NS = "http://www.w3.org/2000/svg";

export function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props ?? {})) {
        if (value === undefined || value === null || value === false) continue;
        if (key === "class") el.className = value;
        else if (key === "text") el.textContent = String(value);
        else if (key === "on") for (const [event, handler] of Object.entries(value)) el.addEventListener(event, handler);
        else if (key === "style") for (const [name, style] of Object.entries(value)) el.style.setProperty(name, style);
        else if (key.startsWith("aria-") || key.startsWith("data-") || key === "role" || key === "for") el.setAttribute(key, String(value));
        else el[key] = value;
    }
    return append(el, children);
}

export function append(el, children) {
    for (const child of [children].flat(Infinity)) {
        if (child === null || child === undefined || child === false || child === "") continue;
        el.append(child instanceof Node ? child : String(child));
    }
    return el;
}

// Text with `code` spans.
export function rich(text) {
    const fragment = document.createDocumentFragment();
    for (const part of String(text ?? "").split(/(`[^`\n]+`)/g)) {
        if (!part) continue;
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) fragment.append(h("code", { text: part.slice(1, -1) }));
        else fragment.append(document.createTextNode(part));
    }
    return fragment;
}

// Paragraphs (split on blank lines) with `code` spans.
export function paras(text, className) {
    return String(text ?? "")
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => h("p", { class: className }, rich(part)));
}

// Simple stroke icons on a 16 x 16 grid.
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ICONS = {
    repo: ["M3.5 2.5h8.5v9H4.75a1.25 1.25 0 0 0 0 2.5H12", "M3.5 13V3.5a1 1 0 0 1 1-1"],
    folder: ["M1.75 4a1 1 0 0 1 1-1h3.2l1.5 1.6h5.8a1 1 0 0 1 1 1v6.65a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1z"],
    file: ["M4 1.75h5l3.25 3.25v8.25a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.75a1 1 0 0 1 1-1z", "M9 1.75V5h3.25"],
    sparkle: ["M8 1.75l1.25 3.5a1.5 1.5 0 0 0 .9.9l3.6 1.35-3.6 1.35a1.5 1.5 0 0 0-.9.9L8 13.25l-1.25-3.5a1.5 1.5 0 0 0-.9-.9L2.25 7.5l3.6-1.35a1.5 1.5 0 0 0 .9-.9z"],
    external: ["M9.5 2.5h4v4", "M13.5 2.5 8 8", "M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"],
    copy: ["M5.5 5.5h7a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z", "M2.5 10.5v-7a1 1 0 0 1 1-1h7"],
    check: ["M3 8.5l3.2 3L13 4.5"],
    "chevron-right": ["M6 3.5 10.5 8 6 12.5"],
    "chevron-down": ["M3.5 6 8 10.5 12.5 6"],
    "arrow-right": ["M3 8h10", "M9 4l4 4-4 4"],
    "arrow-left": ["M13 8H3", "M7 4 3 8l4 4"],
    branch: ["M5 3.5v7", circle(5, 12.5, 1.5), circle(11, 4, 1.5), "M11 5.5c0 3.5-6 2.5-6 5"],
    merged: [circle(4.5, 3.5, 1.5), circle(4.5, 12.5, 1.5), circle(11.5, 9.5, 1.5), "M4.5 5v6", "M4.5 5c0 3 2.5 4.5 5.5 4.5"],
    clock: [circle(8, 8, 6), "M8 4.75V8l2.25 1.5"],
    info: [circle(8, 8, 6), "M8 7.25V11", "M8 5h.01"],
    warn: ["M8 2.25 14.25 13.5H1.75z", "M8 6.5v3", "M8 11.5h.01"],
    search: [circle(7, 7, 4.5), "M10.5 10.5 14 14"],
    bulb: ["M5.75 11.5h4.5", "M6.25 14h3.5", "M8 1.75a4.5 4.5 0 0 0-2.75 8.05V11.5h5.5V9.8A4.5 4.5 0 0 0 8 1.75z"],
    rule: ["M2.5 4h11", "M2.5 8h11", "M2.5 12h7"],
    terminal: ["M2.5 3h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M4.5 6.5 6.5 8l-2 1.5", "M8 10h3.5"],
};

export function icon(name, size = 16) {
    const svg = svgEl("svg", {
        viewBox: "0 0 16 16", width: size, height: size, fill: "none", stroke: "currentColor",
        "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", class: "icon",
    });
    for (const d of ICONS[name] ?? []) svg.append(svgEl("path", { d }));
    return svg;
}

export function svgEl(tag, attributes) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
    return el;
}

const numberFormat = new Intl.NumberFormat();
export function formatNumber(value) {
    return Number.isFinite(value) ? numberFormat.format(value) : "";
}

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS = [["year", 31_536_000], ["month", 2_592_000], ["week", 604_800], ["day", 86_400], ["hour", 3_600], ["minute", 60]];
export function relativeTime(iso) {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return "";
    const seconds = (time - Date.now()) / 1000;
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
    }
    return "just now";
}

export function fullDate(iso) {
    const time = Date.parse(iso);
    return Number.isFinite(time) ? new Date(time).toLocaleString() : "";
}
