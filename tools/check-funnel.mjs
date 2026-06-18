import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function fail(message) {
  errors.push(message);
}

function isExternal(value) {
  return /^(https?:|mailto:|tel:|#|javascript:)/.test(value);
}

function cleanUrl(value) {
  return value.split("#")[0].split("?")[0];
}

function targetPath(fromFile, rawTarget) {
  const cleaned = cleanUrl(rawTarget);
  if (!cleaned || isExternal(rawTarget)) return null;
  if (cleaned.startsWith("/api/")) return null;
  if (cleaned.startsWith("/")) return join(root, cleaned);
  return join(dirname(fromFile), cleaned);
}

function resolveHtmlTarget(path) {
  if (existsSync(path) && statSync(path).isFile()) return path;
  if (existsSync(path) && statSync(path).isDirectory()) {
    const index = join(path, "index.html");
    if (existsSync(index)) return index;
  }
  if (!extname(path)) {
    const withHtml = `${path}.html`;
    if (existsSync(withHtml)) return withHtml;
    const withIndex = join(path, "index.html");
    if (existsSync(withIndex)) return withIndex;
  }
  return null;
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const jsFiles = files.filter((file) => file.endsWith(".js") || file.endsWith(".mjs"));
const publicSweep = /\b(TODO|Stripe non pronto|Tally placeholder|generated from Markdown|Markdown source|HTML-first|sk_live|sk_test|re_[A-Za-z0-9]{20,})\b/i;
const internalLabelSweep = /\bAIOS\b/i;

for (const html of htmlFiles) {
  const source = readFileSync(html, "utf8");
  const rel = relative(root, html);

  if (!source.includes("<!doctype html>")) fail(`${rel}: missing doctype`);
  if (!source.includes("<html")) fail(`${rel}: missing html tag`);
  if (publicSweep.test(source)) fail(`${rel}: public/internal sweep hit`);
  if (!rel.startsWith("00_preview-hub") && internalLabelSweep.test(source)) fail(`${rel}: AIOS label found`);

  const attrs = [...source.matchAll(/\s(?:href|src|action)=["']([^"']+)["']/g)];
  for (const [, raw] of attrs) {
    if (raw.startsWith("file://")) fail(`${rel}: file:// reference ${raw}`);
    const path = targetPath(html, raw);
    if (!path) continue;

    const resolved = resolveHtmlTarget(normalize(path));
    if (!resolved) fail(`${rel}: broken local reference ${raw}`);
  }
}

for (const js of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", js], { stdio: "pipe" });
  } catch (error) {
    fail(`${relative(root, js)}: JS syntax check failed`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`OK: ${htmlFiles.length} HTML files and ${jsFiles.length} JS files checked.`);
