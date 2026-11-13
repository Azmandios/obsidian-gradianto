/*
 * Lightweight checks for the generated Obsidian theme.
 *
 * Usage: node scripts/validate.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "theme.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

let errors = 0;
const fail = (msg) => {
  console.error("  x " + msg);
  errors++;
};

/* ------------------------------------------------------------------ */
/* structural checks                                                   */
/* ------------------------------------------------------------------ */

const open = (css.match(/{/g) || []).length;
const close = (css.match(/}/g) || []).length;
if (open !== close) fail(`unbalanced braces: ${open} { vs ${close} }`);

for (const needle of ["undefined", "NaN", "[object Object]"]) {
  if (css.includes(needle)) fail(`unexpected "${needle}" in theme.css`);
}

if (!manifest.name || !manifest.version || !manifest.minAppVersion) {
  fail("manifest.json is missing name/version/minAppVersion");
}
if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "")) {
  fail(`manifest version is not semver: ${manifest.version}`);
}

/* ------------------------------------------------------------------ */
/* variables                                                           */
/* ------------------------------------------------------------------ */

const defineRe = /(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi;
const defined = new Map();
for (const m of css.matchAll(defineRe)) {
  // First definition wins: the print block at the end intentionally overrides
  // some variables for paper output and should not affect the on-screen checks.
  if (!defined.has(m[1])) defined.set(m[1], m[2].trim());
}

const required = [
  "--background-primary",
  "--background-secondary",
  "--background-secondary-alt",
  "--background-modifier-border",
  "--background-modifier-hover",
  "--text-normal",
  "--text-muted",
  "--text-faint",
  "--text-accent",
  "--text-selection",
  "--text-highlight-bg",
  "--interactive-accent",
  "--interactive-accent-hover",
  "--tab-background-active",
  "--nav-item-background-active",
  "--tag-color",
  "--tag-background",
  "--code-background",
  "--code-keyword",
  "--code-string",
  "--code-function",
  "--code-comment",
  "--h1-color",
  "--h2-color",
  "--h6-color",
  "--link-color",
  "--link-color-hover",
  "--blockquote-border-color",
  "--checkbox-color",
  "--scrollbar-thumb-bg",
  "--graph-node",
];

for (const name of required) {
  if (!defined.has(name)) fail(`missing variable ${name}`);
}

for (const m of css.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
  if (!defined.has(m[1])) fail(`var(${m[1]}) is used but never defined`);
}

const grefs = [...css.matchAll(/--g-[a-z0-9-]+/gi)].map((m) => m[0]);
for (const name of new Set(grefs)) {
  if (!defined.has(name)) fail(`palette variable ${name} is referenced but not defined`);
}

/* ------------------------------------------------------------------ */
/* color sanity                                                        */
/* ------------------------------------------------------------------ */

const colorRe = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)$/i;
for (const [name, value] of defined) {
  for (const token of value.match(/#[0-9a-z]+/gi) || []) {
    if (!/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(token)) {
      fail(`bad hex color for ${name}: ${token}`);
    }
  }
  if (/^rgba?\(/i.test(value) && !parseColor(value)) {
    fail(`bad color function for ${name}: ${value}`);
  }
  if (/^var\(--/.test(value) || colorRe.test(value)) continue;
  if (/-rgb$|opacity$|weight$/.test(name)) continue;
  if (value.includes("var(") || value.includes("#") || /^(rgb|color-mix)/i.test(value)) continue;
  if (/\d(px|em|rem|%)|solid|inset|normal|italic|opacity/i.test(value)) continue;
  // Remaining names that are expected to hold a bare color.
  if (/^--(g-|text-|background-|interactive-|color-|h[1-6]-color|link-|tag-|checkbox-|blockquote-|table-|graph-|canvas-|code-)/.test(name)) {
    fail(`unexpected value for ${name}: ${value}`);
  }
}

/* ------------------------------------------------------------------ */
/* contrast                                                            */
/* ------------------------------------------------------------------ */

function parseColor(value) {
  const v = value.trim();
  let m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(",").map((s) => parseFloat(s));
    return [parts[0], parts[1], parts[2]];
  }
  return null;
}

function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const bg = parseColor(defined.get("--background-primary") || "");
const fg = parseColor(defined.get("--text-normal") || "");
if (bg && fg) {
  const ratio = contrast(bg, fg);
  if (luminance(bg) > 0.35) fail("--background-primary is not a dark color");
  if (ratio < 4.5) fail(`text contrast is only ${ratio.toFixed(2)}:1 (need >= 4.5)`);
  else console.log(`  text contrast: ${ratio.toFixed(2)}:1`);
}

/* ------------------------------------------------------------------ */

if (errors) {
  console.error(`\n${errors} problem(s) found`);
  process.exit(1);
}

console.log(`OK: ${defined.size} variables, ${(css.length / 1024).toFixed(1)} KB, ${manifest.name} ${manifest.version}`);
