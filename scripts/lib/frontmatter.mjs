// Minimal parser for the YAML frontmatter subset used by agent and skill files:
// scalars, quoted strings, booleans, numbers, inline arrays, block arrays,
// one level of nested maps, and "|" or ">" block scalars.

export class FrontmatterError extends Error {}

const OPEN = /^---\r?\n/;
const CLOSE = /\r?\n---[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(text) {
    if (!OPEN.test(text)) return null;
    const afterOpen = text.replace(OPEN, "");
    const close = CLOSE.exec(afterOpen);
    if (!close) throw new FrontmatterError("The frontmatter has no closing --- line.");
    return {
        yaml: afterOpen.slice(0, close.index),
        body: afterOpen.slice(close.index + close[0].length),
    };
}

export function parseFrontmatter(text) {
    const parts = splitFrontmatter(text);
    if (!parts) return null;
    return { data: parseYamlSubset(parts.yaml), body: parts.body };
}

function indentOf(line) {
    return line.length - line.trimStart().length;
}

function stripComment(value) {
    let quote = null;
    for (let i = 0; i < value.length; i += 1) {
        const char = value[i];
        if (quote) {
            if (char === quote) quote = null;
        } else if (char === "'" || char === '"') {
            quote = char;
        } else if (char === "#" && (i === 0 || /\s/.test(value[i - 1]))) {
            return value.slice(0, i).trimEnd();
        }
    }
    return value;
}

function splitInlineList(inner) {
    const items = [];
    let current = "";
    let quote = null;
    for (const char of inner) {
        if (quote) {
            current += char;
            if (char === quote) quote = null;
        } else if (char === "'" || char === '"') {
            quote = char;
            current += char;
        } else if (char === ",") {
            items.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    if (quote) throw new FrontmatterError("An inline list has an unclosed quote.");
    if (current.trim()) items.push(current.trim());
    return items;
}

export function parseScalar(raw) {
    const value = stripComment(raw.trim());
    if (value === "") return null;
    if (value.startsWith("'")) {
        if (!value.endsWith("'") || value.length < 2) throw new FrontmatterError(`Unclosed single quote: ${value}`);
        return value.slice(1, -1).replace(/''/g, "'");
    }
    if (value.startsWith('"')) {
        try {
            return JSON.parse(value);
        } catch {
            throw new FrontmatterError(`Invalid double-quoted string: ${value}`);
        }
    }
    if (value.startsWith("[")) {
        if (!value.endsWith("]")) throw new FrontmatterError(`Unclosed inline list: ${value}`);
        return splitInlineList(value.slice(1, -1)).map((item) => parseScalar(item));
    }
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null" || value === "~") return null;
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    return value;
}

function parseBlockScalar(lines, start, parentIndent, style) {
    const collected = [];
    let index = start;
    let blockIndent = null;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === "") {
            collected.push("");
            index += 1;
            continue;
        }
        const indent = indentOf(line);
        if (indent <= parentIndent) break;
        if (blockIndent === null) blockIndent = indent;
        collected.push(line.slice(Math.min(indent, blockIndent)));
        index += 1;
    }
    while (collected.length && collected[collected.length - 1] === "") collected.pop();
    const text = style === ">" ? collected.join(" ").replace(/\s+\n/g, "\n") : collected.join("\n");
    return { value: text, next: index };
}

function parseNested(lines, start, parentIndent) {
    let index = start;
    while (index < lines.length && lines[index].trim() === "") index += 1;
    if (index >= lines.length || indentOf(lines[index]) <= parentIndent) return { value: null, next: start };

    const childIndent = indentOf(lines[index]);
    if (lines[index].trimStart().startsWith("- ") || lines[index].trim() === "-") {
        const items = [];
        while (index < lines.length) {
            const line = lines[index];
            if (line.trim() === "") {
                index += 1;
                continue;
            }
            if (indentOf(line) !== childIndent || !line.trimStart().startsWith("-")) break;
            items.push(parseScalar(line.trimStart().slice(1)));
            index += 1;
        }
        return { value: items, next: index };
    }

    const map = {};
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === "" || line.trimStart().startsWith("#")) {
            index += 1;
            continue;
        }
        const indent = indentOf(line);
        if (indent < childIndent) break;
        if (indent > childIndent) throw new FrontmatterError(`Unexpected indentation: ${line.trim()}`);
        const match = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(line.trim());
        if (!match) throw new FrontmatterError(`Cannot parse line: ${line.trim()}`);
        const [, key, rest = ""] = match;
        index += 1;
        if (rest.trim() === "") {
            const nested = parseNested(lines, index, indent);
            map[key] = nested.value;
            index = nested.next;
        } else {
            map[key] = parseScalar(rest);
        }
    }
    return { value: map, next: index };
}

export function parseYamlSubset(yaml) {
    const lines = yaml.split(/\r?\n/);
    const data = {};
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (line.trim() === "" || line.trimStart().startsWith("#")) {
            index += 1;
            continue;
        }
        if (indentOf(line) !== 0) throw new FrontmatterError(`Unexpected indentation: ${line.trim()}`);
        const match = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(line);
        if (!match) throw new FrontmatterError(`Cannot parse line: ${line}`);
        const [, key, rest = ""] = match;
        if (Object.hasOwn(data, key)) throw new FrontmatterError(`Duplicate key: ${key}`);
        index += 1;
        const trimmed = rest.trim();
        if (trimmed === "|" || trimmed === ">" || trimmed === "|-" || trimmed === ">-") {
            const block = parseBlockScalar(lines, index, 0, trimmed[0]);
            data[key] = block.value;
            index = block.next;
        } else if (trimmed === "") {
            const nested = parseNested(lines, index, 0);
            data[key] = nested.value;
            index = nested.next;
        } else {
            data[key] = parseScalar(rest);
        }
    }
    return data;
}
