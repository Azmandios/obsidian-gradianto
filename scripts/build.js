/*
 * Gradianto Nature Green -> Obsidian theme converter.
 *
 * Reads the original JetBrains Gradianto definitions
 * (src/*.theme.json + src/*.xml) and emits:
 *   theme.css     - the Obsidian theme
 *   manifest.json - Obsidian theme manifest
 *
 * Usage: node scripts/build.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const THEME_JSON = "Gradianto_Nature_Green_new.theme.json";
const SCHEME = "Gradianto_Nature_Green_new.xml";
const LEGACY_SCHEME = "Gradianto_Nature_Green.xml";
const NAME = "Gradianto Nature Green";
const VERSION = "0.1.4";

/* ------------------------------------------------------------------ */
/* color helpers                                                       */
/* ------------------------------------------------------------------ */

// JetBrains stores colors as bare hex, sometimes short ("6858" = 0x006858),
// sometimes with alpha ("14262694" = RRGGBBAA).
function hx(value, fallback = null) {
  if (!value) return fallback;
  let s = String(value).trim().replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]+$/.test(s)) return fallback;
  if (s.length <= 6) s = s.padStart(6, "0");
  else if (s.length === 7) s = "0" + s;
  if (s.length === 6 || s.slice(6) === "FF") return "#" + s.slice(0, 6);
  if (s.length === 8) return "#" + s;
  return fallback;
}

const rgb = (color) => {
  const s = color.replace("#", "").slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

const alphaOf = (color) => {
  const s = color.replace("#", "");
  return s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
};

function hex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

// t = 0 -> a, t = 1 -> b
function mix(a, b, t) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const lighten = (c, t) => mix(c, "#FFFFFF", t);
const darken = (c, t) => mix(c, "#000000", t);
const rgba = (c, a) => `rgba(${rgb(c).join(", ")}, ${a})`;

/* ------------------------------------------------------------------ */
/* JetBrains file parsing                                              */
/* ------------------------------------------------------------------ */

function parseScheme(xml) {
  const colors = {};
  const colorsBlock = xml.match(/<colors>([\s\S]*?)<\/colors>/);
  if (colorsBlock) {
    for (const m of colorsBlock[1].matchAll(/<option\s+name="([^"]+)"\s+value="([^"]*)"/g)) {
      colors[m[1]] = m[2];
    }
  }

  // Small stack based parser for <attributes>: the files mix self-closing
  // options with nested <value><option .../></value> containers.
  const attrs = {};
  const attrsBlock = xml.match(/<attributes>([\s\S]*?)<\/attributes>/);
  if (attrsBlock) {
    const tagRe = /<option\b([^>]*)>|<\/option>/g;
    const root = { children: [] };
    const stack = [root];
    for (const m of attrsBlock[1].matchAll(tagRe)) {
      if (m[0] === "</option>") {
        if (stack.length > 1) {
          const node = stack.pop();
          stack[stack.length - 1].children.push(node);
        }
        continue;
      }
      const raw = m[1];
      const selfClosing = /\/\s*$/.test(raw);
      const nameMatch = raw.match(/\bname="([^"]*)"/);
      const valueMatch = raw.match(/\bvalue="([^"]*)"/);
      const node = {
        name: nameMatch ? nameMatch[1] : undefined,
        value: valueMatch ? valueMatch[1] : undefined,
        children: [],
      };
      if (selfClosing) stack[stack.length - 1].children.push(node);
      else stack.push(node);
    }
    for (const node of root.children) {
      if (!node.name) continue;
      const values = {};
      for (const child of node.children) {
        if (child.name === "value") {
          for (const inner of child.children) {
            if (inner.name) values[inner.name] = inner.value ?? "";
          }
        } else if (child.name) {
          values[child.name] = child.value ?? "";
        }
      }
      attrs[node.name] = values;
    }
  }
  return { colors, attrs };
}

/* ------------------------------------------------------------------ */
/* palette                                                             */
/* ------------------------------------------------------------------ */

const themeJson = JSON.parse(fs.readFileSync(path.join(SRC, THEME_JSON), "utf8"));
const scheme = parseScheme(fs.readFileSync(path.join(SRC, SCHEME), "utf8"));
const legacy = parseScheme(fs.readFileSync(path.join(SRC, LEGACY_SCHEME), "utf8"));

// The "_new" schemes inherit undefined attributes from Darcula, so merge the
// original Gradianto scheme in to pick up every color the author declared.
for (const [k, v] of Object.entries(legacy.colors)) {
  if (!(k in scheme.colors)) scheme.colors[k] = v;
}
for (const [k, v] of Object.entries(legacy.attrs)) {
  scheme.attrs[k] = { ...v, ...(scheme.attrs[k] || {}) };
}

const ui = themeJson.ui || {};
const base = ui["*"] || {};
const tabs = ui.EditorTabs || {};
const tree = ui.Tree || {};
const popup = ui.Popup || {};
const scroll = ui.ScrollBar || {};
const linkUi = ui.Link || {};
const match = ui.SearchMatch || {};
const borders = ui.Borders || {};

const clr = (name) => hx(scheme.colors[name]);
const at = (name) => scheme.attrs[name] || {};
const fg = (name, fallback = null) => hx(at(name).FOREGROUND, fallback);
const bg = (name, fallback = null) => hx(at(name).BACKGROUND, fallback);

const editorBg = bg("TEXT", clr("CONSOLE_BACKGROUND_KEY") || "#132623");
const editorFg = fg("TEXT", "#a8afbe");
const uiBg = hx(base.background, "#20403f");
const uiFg = hx(base.foreground, "#cccece");
const panelBg = hx(tree.background, uiBg);
const tabsBg = hx(tabs.background, darken(uiBg, 0.12));
const tabActive = hx(tabs.selectedBackground, "#006448");
const popupBg = hx(popup.background, lighten(uiBg, 0.03));
const border = hx(base.borderColor, darken(uiBg, 0.35));
const borderSoft = hx(borders.color, hx(base.separatorColor, border));
const selection = hx(base.selectionBackground, "#00695c");
const selectionFg = hx(base.selectionForeground, "#f1f4f6");

const accent = "#60cf92";
const accentAlt = "#2ea9aa";
const accentHover = lighten(accent, 0.12);
// Keep secondary text readable on the lighter panel background (#20403f),
// while preserving the muted hierarchy of the original theme.
const muted = mix(editorFg, editorBg, 0.1);
const faint = mix(editorFg, editorBg, 0.38);
const formatting = hx(clr("DOC_COMMENT_LINK"), mix(editorFg, editorBg, 0.6));
const codeBg = mix(editorBg, panelBg, 0.3);
const activeLine = clr("CARET_ROW_COLOR") || mix(editorBg, editorFg, 0.08);

const keyword = fg("DEFAULT_KEYWORD", "#2ea9aa");
const string = fg("DEFAULT_STRING", "#acac58");
const number = fg("DEFAULT_NUMBER", "#bb8f73");
const comment = fg("DEFAULT_LINE_COMMENT", "#54806d");
const docComment = fg("DEFAULT_DOC_COMMENT", comment);
const fn = fg("DEFAULT_FUNCTION_DECLARATION", "#d07bd2");
const type = fg("DEFAULT_CLASS_NAME", "#c6c666");
const metadata = fg("DEFAULT_METADATA", "#9ebb52");
const property = fg("DEFAULT_INSTANCE_FIELD", "#6baa85");
const variable = fg("DEFAULT_LOCAL_VARIABLE", "#af6e86");
const parameter = fg("DEFAULT_PARAMETER", "#8675a9");
const constant = fg("DEFAULT_CONSTANT", "#71aa84");
const operator = fg("DEFAULT_COMMA", "#ccb86c");
const punctuation = fg("DEFAULT_SEMICOLON", "#a3ccb5");
const tag = fg("XML_TAG_NAME", "#aa614f");
const escape = fg("DEFAULT_VALID_STRING_ESCAPE", "#aab77c");
const regexp = fg("REGEXP.CHARACTER", "#75aa7b");

const status = {
  error: "#e91e63",
  warning: "#f49810",
  info: "#5394ec",
  success: "#7edb7f",
};

const p = {
  editorBg,
  editorFg,
  uiBg,
  uiFg,
  panelBg,
  tabsBg,
  tabActive,
  tabStrip: darken(tabsBg, 0.08),
  popupBg,
  border,
  borderSoft,
  selection,
  selectionFg,
  accent,
  accentAlt,
  accentHover,
  accentDim: mix(accent, editorBg, 0.45),
  link: accent,
  linkHover: hx(linkUi.hoverForeground, "#cded91"),
  external: fg("DEFAULT_IDENTIFIER", "#5f93c9"),
  unresolved: fg("DEFAULT_STATIC_METHOD", "#c48d9c"),
  hover: rgba(hx(tabs.hoverMaskColor, "#386d54"), 0.35),
  hoverStrong: rgba(hx(tabs.hoverMaskColor, "#386d54"), 0.55),
  muted,
  faint,
  formatting,
  codeBg,
  activeLine,
  gutterBg: clr("GUTTER_BACKGROUND") || mix(editorBg, panelBg, 0.25),
  lineNumber: clr("LINE_NUMBERS_COLOR") || muted,
  indentGuide: clr("INDENT_GUIDE") || mix(editorBg, editorFg, 0.12),
  scrollThumb: hx(scroll.thumbColor, "#3b6d3f"),
  scrollThumbHover: hx(scroll.hoverThumbColor, "#498653"),
  keyword,
  string,
  number,
  comment,
  docComment,
  fn,
  type,
  metadata,
  property,
  variable,
  parameter,
  constant,
  operator,
  punctuation,
  tag,
  escape,
  regexp,
  highlight: rgba(hx(match.endBackground, "#2d7156"), 0.45),
  highlightActive: rgba(hx(match.startBackground, "#679d81"), 0.55),
  quoteBorder: accentAlt,
  quoteBg: rgba(panelBg, 0.25),
  quoteColor: mix(editorFg, accentAlt, 0.15),
  tableBorder: mix(borderSoft, panelBg, 0.35),
  tableHeaderBg: tabsBg,
  tableAltBg: rgba(panelBg, 0.35),
  hr: hx(base.separatorColor, "#20574f"),
  tagBg: rgba(accent, 0.12),
  tagBgHover: rgba(accent, 0.2),
  tagBorder: rgba(accent, 0.22),
  ...status,
};

/* ------------------------------------------------------------------ */
/* stylesheet                                                          */
/* ------------------------------------------------------------------ */

const css = `/* ==========================================================================
   Gradianto Nature Green for Obsidian
   --------------------------------------------------------------------------
   Port of the JetBrains theme by thvardhan:
   https://github.com/thvardhan/Gradianto
   Colors are taken from the original JetBrains scheme
   (src/Gradianto_Nature_Green_new.xml + the legacy scheme), not eyeballed.

   Generated by scripts/build.js - do not edit theme.css by hand.
   ========================================================================== */

body,
body.theme-dark,
body.theme-light {
  color-scheme: dark;

  /* ---- raw Gradianto palette ------------------------------------------ */
  --g-bg: ${p.editorBg};
  --g-bg-panel: ${p.panelBg};
  --g-bg-tabs: ${p.tabsBg};
  --g-bg-strip: ${p.tabStrip};
  --g-bg-elevated: ${p.popupBg};
  --g-bg-gutter: ${p.gutterBg};
  --g-bg-active-line: ${p.activeLine};
  --g-bg-selection: ${p.selection};
  --g-bg-tab-active: ${p.tabActive};
  --g-border: ${p.border};
  --g-border-soft: ${p.borderSoft};
  --g-fg: ${p.editorFg};
  --g-fg-ui: ${p.uiFg};
  --g-fg-muted: ${p.muted};
  --g-fg-faint: ${p.faint};
  --g-line-number: ${p.lineNumber};
  --g-accent: ${p.accent};
  --g-accent-hover: ${p.accentHover};
  --g-accent-2: ${p.accentAlt};
  --g-link: ${p.link};
  --g-link-hover: ${p.linkHover};
  --g-link-external: ${p.external};
  --g-link-unresolved: ${p.unresolved};
  --g-error: ${p.error};
  --g-warning: ${p.warning};
  --g-info: ${p.info};
  --g-success: ${p.success};
  --g-syntax-keyword: ${p.keyword};
  --g-syntax-string: ${p.string};
  --g-syntax-number: ${p.number};
  --g-syntax-comment: ${p.comment};
  --g-syntax-doc-comment: ${p.docComment};
  --g-syntax-function: ${p.fn};
  --g-syntax-type: ${p.type};
  --g-syntax-metadata: ${p.metadata};
  --g-syntax-property: ${p.property};
  --g-syntax-variable: ${p.variable};
  --g-syntax-parameter: ${p.parameter};
  --g-syntax-constant: ${p.constant};
  --g-syntax-operator: ${p.operator};
  --g-syntax-punctuation: ${p.punctuation};
  --g-syntax-tag: ${p.tag};
  --g-syntax-escape: ${p.escape};
  --g-syntax-regexp: ${p.regexp};
  --g-scroll-thumb: ${p.scrollThumb};
  --g-scroll-thumb-hover: ${p.scrollThumbHover};
  --g-highlight: ${p.highlight};
  --g-highlight-active: ${p.highlightActive};
  --g-quote-border: ${p.quoteBorder};
  --g-quote-bg: ${p.quoteBg};
  --g-quote-color: ${p.quoteColor};
  --g-table-border: ${p.tableBorder};
  --g-table-header: ${p.tableHeaderBg};
  --g-table-alt: ${p.tableAltBg};

  /* ---- Obsidian core -------------------------------------------------- */
  --background-primary: ${p.editorBg};
  --background-primary-alt: ${mix(p.editorBg, p.panelBg, 0.22)};
  --background-secondary: ${p.panelBg};
  --background-secondary-alt: ${p.tabsBg};
  --background-tertiary: ${p.tabStrip};
  --background-accent: ${p.accent};
  --background-modifier-border: ${p.border};
  --background-modifier-border-hover: ${p.borderSoft};
  --background-modifier-border-focus: ${p.accent};
  --background-modifier-hover: ${p.hover};
  --background-modifier-active-hover: ${rgba(p.selection, 0.55)};
  --background-modifier-form-field: ${mix(p.editorBg, p.panelBg, 0.16)};
  --background-modifier-form-field-highlighted: ${mix(p.editorBg, p.panelBg, 0.3)};
  --background-modifier-box-shadow: rgba(0, 0, 0, 0.45);
  --background-modifier-success: ${rgba(p.success, 0.18)};
  --background-modifier-error: ${rgba(p.error, 0.18)};
  --background-modifier-error-hover: ${rgba(p.error, 0.3)};
  --background-modifier-error-rgb: ${rgb(p.error).join(", ")};
  --background-modifier-cover: rgba(6, 18, 16, 0.75);

  --text-normal: ${p.editorFg};
  --text-muted: ${p.muted};
  --text-faint: ${p.faint};
  --text-on-accent: #0d211d;
  --text-on-accent-inverted: ${p.uiFg};
  --text-selection: ${rgba(p.selection, 0.78)};
  --text-highlight-bg: ${p.highlight};
  --text-highlight-bg-active: ${p.highlightActive};
  --text-accent: ${p.accent};
  --text-accent-hover: ${p.linkHover};
  --text-success: ${p.success};
  --text-warning: ${p.warning};
  --text-error: ${p.error};
  --text-formatting: ${p.formatting};
  --text-blockquote: ${p.quoteColor};
  --text-code: ${p.editorFg};
  --text-code-comment: ${p.comment};

  --interactive-normal: ${p.tabsBg};
  --interactive-hover: ${mix(p.tabsBg, p.accent, 0.18)};
  --interactive-accent: ${p.tabActive};
  --interactive-accent-hover: ${lighten(p.tabActive, 0.08)};
  --interactive-accent-rgb: ${rgb(p.tabActive).join(", ")};
  --interactive-success: ${p.success};
  --input-shadow: inset 0 0 0 1px ${p.border};
  --input-shadow-focus: inset 0 0 0 1px ${p.accent};

  --color-accent: ${p.accent};
  --color-accent-hover: ${p.accentHover};
  --color-accent-1: ${p.accent};
  --color-accent-2: ${p.accentAlt};
  --color-red: ${p.error};
  --color-orange: #cc844f;
  --color-yellow: #c6c666;
  --color-green: ${p.success};
  --color-cyan: ${p.accentAlt};
  --color-blue: ${p.info};
  --color-purple: #d07bd2;
  --color-pink: #c07cd6;

  /* ---- chrome --------------------------------------------------------- */
  --titlebar-background: ${darken(p.tabsBg, 0.2)};
  --titlebar-background-focused: ${darken(p.tabsBg, 0.2)};
  --titlebar-text-color: ${p.muted};
  --titlebar-text-color-focused: ${p.uiFg};
  --titlebar-border-color: ${p.border};
  --titlebar-border-width: 1px;

  --ribbon-background: ${p.tabsBg};
  --ribbon-background-collapsed: ${p.tabsBg};
  --ribbon-border-color: ${p.border};

  --tab-container-background: ${darken(p.tabsBg, 0.16)};
  --tab-background-active: ${p.tabActive};
  --tab-background-hover: ${mix(p.tabsBg, p.accent, 0.14)};
  --tab-text-color: ${p.uiFg};
  --tab-text-color-active: #f1f4f6;
  --tab-text-color-focused: ${p.uiFg};
  --tab-text-color-focused-active: #f1f4f6;
  --tab-text-color-focused-active-current: #ffffff;
  --tab-text-color-focused-highlighted: ${p.accent};
  --tab-outline-color: ${mix(p.borderSoft, p.accent, 0.22)};
  --tab-outline-width: 1px;
  --tab-divider-color: ${mix(p.tabsBg, p.accent, 0.45)};
  --tab-inner-background-hover: ${rgba(p.accent, 0.14)};
  --tab-radius: 4px 4px 0 0;
  --tab-radius-active: 4px 4px 0 0;

  --status-bar-background: ${p.tabsBg};
  --status-bar-text-color: ${p.muted};
  --status-bar-border-color: ${p.border};

  --file-header-background: ${p.panelBg};
  --file-header-background-focused: ${p.panelBg};
  --file-header-border: 1px solid ${p.border};

  --divider-color: ${p.hr};
  --divider-color-hover: ${p.accent};
  --prompt-border-color: ${p.borderSoft};

  --scrollbar-bg: transparent;
  --scrollbar-thumb-bg: ${p.scrollThumb};
  --scrollbar-active-thumb-bg: ${p.scrollThumbHover};

  --modal-background: ${p.popupBg};
  --modal-border-color: ${p.borderSoft};
  --modal-border-width: 1px;
  --modal-radius: 6px;

  --menu-background: ${p.popupBg};
  --menu-border-color: ${p.borderSoft};
  --menu-item-color: ${p.uiFg};
  --menu-item-icon-color: ${p.muted};

  --nav-item-color: ${p.uiFg};
  --nav-item-color-hover: #eceff1;
  --nav-item-color-active: ${p.selectionFg};
  --nav-item-color-selected: ${p.selectionFg};
  --nav-item-background-hover: ${p.hover};
  --nav-item-background-active: ${p.selection};
  --nav-item-background-selected: ${p.selection};
  --nav-item-color-highlighted: ${p.accent};
  --nav-heading-color: ${p.muted};
  --nav-heading-color-hover: ${p.uiFg};
  --nav-heading-color-collapsed: ${p.muted};
  --nav-heading-color-collapsed-hover: ${p.uiFg};
  --nav-collapse-icon-color: ${p.muted};
  --nav-collapse-icon-color-collapsed: ${p.muted};
  --nav-indentation-guide-color: ${p.indentGuide};
  --nav-indentation-guide-color-active: ${p.accentDim};

  --tag-color: ${p.accent};
  --tag-color-hover: ${p.linkHover};
  --tag-background: ${p.tagBg};
  --tag-background-hover: ${p.tagBgHover};
  --tag-border-color: ${p.tagBorder};
  --tag-border-color-hover: ${rgba(p.accent, 0.4)};
  --tag-border-width: 1px;
  --tag-radius: 3px;

  --checkbox-color: ${p.tabActive};
  --checkbox-color-hover: ${lighten(p.tabActive, 0.1)};
  --checkbox-border-color: ${mix(p.borderSoft, p.accent, 0.35)};
  --checkbox-border-color-hover: ${p.accent};
  --checkbox-marker-color: #e8f5ee;
  --checkbox-radius: 3px;
  --checklist-done-color: ${p.muted};

  --link-color: ${p.link};
  --link-color-hover: ${p.linkHover};
  --link-external-color: ${p.external};
  --link-external-color-hover: ${lighten(p.external, 0.18)};
  --link-unresolved-color: ${p.unresolved};
  --link-unresolved-opacity: 0.9;
  --link-unresolved-decoration-color: ${rgba(p.unresolved, 0.45)};

  --blockquote-border-color: ${p.quoteBorder};
  --blockquote-border-thickness: 3px;
  --blockquote-color: ${p.quoteColor};
  --blockquote-background-color: ${p.quoteBg};
  --blockquote-font-style: normal;

  --hr-color: ${p.hr};
  --hr-thickness: 1px;

  --table-border-color: ${p.tableBorder};
  --table-border-width: 1px;
  --table-header-background: ${p.tableHeaderBg};
  --table-header-color: ${p.uiFg};
  --table-row-alt-background: ${p.tableAltBg};
  --table-row-background-hover: ${p.hover};

  --inline-title-color: ${p.accent};
  --inline-title-weight: 600;

  --h1-color: ${p.accent};
  --h2-color: ${p.accentAlt};
  --h3-color: #d07bd2;
  --h4-color: #c6c666;
  --h5-color: #bb8f73;
  --h6-color: ${p.metadata};
  --h1-weight: 600;
  --h2-weight: 600;
  --h3-weight: 600;
  --h4-weight: 600;
  --h5-weight: 600;
  --h6-weight: 600;
  --heading-formatting: ${p.formatting};

  --bold-color: ${p.uiFg};
  --italic-color: ${p.editorFg};
  --strikethrough-color: ${p.muted};

  --list-marker-color: ${p.accent};
  --list-marker-color-hover: ${p.linkHover};
  --list-marker-color-collapsed: ${p.accentAlt};
  --list-indent: 1.6em;

  /* ---- code ----------------------------------------------------------- */
  --code-background: ${p.codeBg};
  --code-normal: ${p.editorFg};
  --code-comment: ${p.comment};
  --code-function: ${p.fn};
  --code-important: ${p.unresolved};
  --code-keyword: ${p.keyword};
  --code-operator: ${p.operator};
  --code-property: ${p.property};
  --code-punctuation: ${p.punctuation};
  --code-string: ${p.string};
  --code-tag: ${p.tag};
  --code-value: ${p.number};
  --code-radius: var(--radius-s);
  --code-border-width: 1px;
  --code-border-color: ${rgba(p.accent, 0.12)};

  /* ---- misc ----------------------------------------------------------- */
  --caret-color: ${p.accent};
  --highlight-background: ${p.highlight};
  --search-result-background: ${p.editorBg};
  --font-monospace-theme: "JetBrains Mono", "Cascadia Code", "Fira Code", ui-monospace,
    SFMono-Regular, Menlo, Consolas, monospace;
  --line-height-normal: 1.55;

  --radius-s: 3px;
  --radius-m: 5px;
  --radius-l: 7px;
  --input-radius: 4px;
  --button-radius: 4px;

  --graph-line: ${p.tableBorder};
  --graph-node: ${p.accent};
  --graph-node-focused: ${p.linkHover};
  --graph-node-tag: #d07bd2;
  --graph-node-attachment: ${p.number};
  --graph-node-unresolved: ${p.faint};
  --graph-text: ${p.editorFg};

  --canvas-background: ${p.editorBg};
  --canvas-dot-pattern: ${p.indentGuide};
  --canvas-color-1: ${p.error};
  --canvas-color-2: ${p.warning};
  --canvas-color-3: #c6c666;
  --canvas-color-4: ${p.success};
  --canvas-color-5: ${p.accentAlt};
  --canvas-color-6: #d07bd2;

  --metadata-input-background: ${mix(p.editorBg, p.panelBg, 0.16)};
  --metadata-input-background-hover: ${mix(p.editorBg, p.panelBg, 0.26)};
  --metadata-input-text-color: ${p.editorFg};
  --metadata-label-text-color: ${p.muted};
  --metadata-label-text-color-hover: ${p.uiFg};
  --metadata-divider-color: ${p.border};

  --embed-background: ${mix(p.editorBg, p.panelBg, 0.18)};
  --embed-border-left: 2px solid ${p.accentDim};
  --embed-block-shadow-hover: 0 0 0 1px ${p.borderSoft}, inset 0 0 0 1px ${p.borderSoft};

  --callout-border-width: 0px;
  --callout-default: ${p.info};
  --callout-info: ${p.info};
  --callout-summary: ${p.accentAlt};
  --callout-todo: ${p.info};
  --callout-tip: ${p.accent};
  --callout-success: ${p.success};
  --callout-question: #d07bd2;
  --callout-warning: ${p.warning};
  --callout-fail: ${p.error};
  --callout-error: ${p.error};
  --callout-bug: ${p.error};
  --callout-example: ${p.accentAlt};
  --callout-quote: #a3ccb5;
  --callout-important: ${p.accentAlt}
}

/* ==========================================================================
   Workspace chrome
   ========================================================================== */

body {
  background-color: var(--background-secondary);
  accent-color: var(--g-accent);
}

.workspace-ribbon,
.workspace-ribbon.mod-left,
.workspace-ribbon.mod-right {
  background-color: var(--ribbon-background);
  border-color: var(--background-modifier-border);
}

.workspace-ribbon .clickable-icon {
  color: var(--text-muted);
}

.workspace-ribbon .clickable-icon:hover {
  color: var(--g-accent);
  background-color: var(--background-modifier-hover);
}

.titlebar {
  background-color: var(--titlebar-background);
  color: var(--titlebar-text-color);
}

/* Do NOT paint .titlebar-inner: in frameless mode it is a transparent overlay
   above the tab bar and an opaque background hides every tab. */
.titlebar-inner {
  color: var(--titlebar-text-color);
}

.titlebar-button-container .titlebar-button:hover {
  background-color: var(--background-modifier-hover);
}

.workspace-tab-header-container {
  background-color: var(--tab-container-background);
  border-bottom: 1px solid var(--background-modifier-border);
}

.workspace-tab-header-container .workspace-tab-header {
  color: var(--tab-text-color);
}

.workspace-tab-header-container .workspace-tab-header:not(.is-active) {
  background-color: var(--g-bg-tabs);
}

.workspace-tab-header-container .workspace-tab-header:not(.is-active) .workspace-tab-header-inner-icon {
  color: ${mix(p.uiFg, p.tabsBg, 0.18)};
  opacity: 0.95;
}

.workspace-tab-header-container .workspace-tab-header:not(.is-active) .workspace-tab-header-inner-title {
  color: var(--tab-text-color);
}

/* Make the 1px separators Obsidian draws between tab titles easier to see. */
.workspace .mod-root .workspace-tab-header-inner:after {
  width: 2px;
  height: 58%;
  border-radius: 1px;
  background-color: var(--tab-divider-color);
}

.workspace-tab-header:hover {
  background-color: var(--tab-background-hover);
}

.workspace-tab-header-container .workspace-tab-header.is-active {
  background-color: var(--tab-background-active);
  color: var(--tab-text-color-active);
  box-shadow: 0 0 0 1px var(--tab-outline-color), inset 0 -2px 0 ${p.accent};
}

.workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner-icon,
.workspace-tab-header-container .workspace-tab-header.is-active .workspace-tab-header-inner-title {
  color: var(--tab-text-color-active);
}

.workspace-tab-header.is-active .workspace-tab-header-inner-close-button {
  color: var(--tab-text-color-active);
}

.workspace-tab-header-inner-close-button:hover {
  background-color: ${rgba("#000000", 0.18)};
}

.view-header {
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
}

.view-header-title {
  color: var(--text-muted);
}

.view-header-title:hover {
  color: var(--text-normal);
}

.view-header-breadcrumb {
  color: var(--text-faint);
}

.view-header-breadcrumb-separator {
  color: var(--text-faint);
}

.status-bar {
  background-color: var(--status-bar-background);
  border-top: 1px solid var(--status-bar-border-color);
  color: var(--text-muted);
}

.status-bar-item:hover {
  color: var(--text-normal);
}

.workspace-leaf-resize-handle:hover {
  background-color: ${rgba(p.accent, 0.35)};
}

.workspace-split.mod-root .workspace-leaf-content {
  border-color: var(--background-modifier-border);
}

/* ==========================================================================
   Sidebar / navigation
   ========================================================================== */

.nav-file-title,
.nav-folder-title {
  color: var(--nav-item-color);
  border-radius: var(--radius-s);
}

.nav-file-title:hover,
.nav-folder-title:hover {
  background-color: var(--nav-item-background-hover);
  color: var(--nav-item-color-hover);
}

.nav-file-title.is-active,
.nav-folder-title.is-active,
.nav-file-title.is-selected {
  background-color: var(--nav-item-background-active);
  color: var(--nav-item-color-active);
}

.nav-file-tag {
  background-color: ${rgba(p.accent, 0.16)};
  color: var(--g-accent);
}

.nav-folder-collapse-indicator,
.tree-item-self .collapse-icon {
  color: var(--nav-collapse-icon-color);
}

.tree-item-self.is-collapsed .collapse-icon {
  color: var(--nav-collapse-icon-color-collapsed);
}

.tree-item-children {
  border-inline-start-color: var(--nav-indentation-guide-color);
}

.nav-buttons-container {
  background-color: var(--background-secondary);
}

.nav-action-button:hover {
  background-color: var(--background-modifier-hover);
}

.workspace-leaf-content[data-type="file-explorer"] .nav-header {
  border-bottom: 1px solid var(--background-modifier-border);
}

.workspace-leaf-content[data-type="outline"] .tree-item-self {
  color: var(--text-muted);
}

.workspace-leaf-content[data-type="outline"] .tree-item-self:hover {
  color: var(--text-normal);
}

/* ==========================================================================
   Menus, prompts, modals, settings
   ========================================================================== */

.menu {
  background-color: var(--menu-background);
  border: 1px solid var(--menu-border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.menu-item {
  color: var(--menu-item-color);
}

.menu-item:hover,
.menu-item.selected {
  background-color: ${rgba(p.selection, 0.75)};
  color: ${p.selectionFg};
}

.menu-item-icon {
  color: var(--menu-item-icon-color);
}

.menu-separator {
  border-color: var(--background-modifier-border);
}

.modal {
  background-color: var(--modal-background);
  border: 1px solid var(--modal-border-color);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.modal-close-button {
  color: var(--text-muted);
}

.modal-close-button:hover {
  color: var(--text-normal);
  background-color: var(--background-modifier-hover);
}

.modal-title {
  color: var(--g-fg-ui);
}

.prompt {
  background-color: var(--modal-background);
  border: 1px solid var(--prompt-border-color);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.prompt-input {
  background-color: var(--background-modifier-form-field);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
}

.prompt-input:focus {
  border-color: var(--g-accent);
  box-shadow: 0 0 0 1px ${rgba(p.accent, 0.35)};
}

.suggestion-item {
  color: var(--text-normal);
}

.suggestion-item.is-selected {
  background-color: ${rgba(p.selection, 0.8)};
  color: ${p.selectionFg};
}

.suggestion-hotkey {
  color: var(--text-faint);
}

.vertical-tab-header {
  background-color: var(--background-secondary-alt);
  border-inline-end: 1px solid var(--background-modifier-border);
}

.vertical-tab-header-group-title {
  color: var(--text-faint);
}

.vertical-tab-nav-item {
  color: var(--text-muted);
}

.vertical-tab-nav-item:hover {
  background-color: var(--background-modifier-hover);
  color: var(--text-normal);
}

.vertical-tab-nav-item.is-active {
  background-color: var(--nav-item-background-active);
  color: var(--nav-item-color-active);
}

.setting-item {
  border-top-color: var(--background-modifier-border);
}

.setting-item-name {
  color: var(--text-normal);
}

.setting-item-description {
  color: var(--text-muted);
}

.setting-hotkey {
  background-color: ${rgba(p.panelBg, 0.6)};
  color: var(--text-muted);
}

/* ==========================================================================
   Buttons, inputs, toggles, tags
   ========================================================================== */

button:not(.clickable-icon) {
  background-color: var(--interactive-normal);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
  box-shadow: none;
}

button:not(.clickable-icon):hover {
  background-color: var(--interactive-hover);
  border-color: var(--background-modifier-border-hover);
  color: var(--text-normal);
}

button.mod-cta,
button.mod-cta:hover {
  background-color: var(--interactive-accent);
  border-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

button.mod-cta:hover {
  background-color: var(--interactive-accent-hover);
}

button.mod-warning {
  background-color: ${rgba(p.error, 0.18)};
  border-color: ${rgba(p.error, 0.55)};
  color: ${p.error};
}

input[type="text"],
input[type="search"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="date"],
input[type="datetime-local"],
textarea,
select {
  background-color: var(--background-modifier-form-field);
  border: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
}

input[type="text"]:focus,
input[type="search"]:focus,
input[type="email"]:focus,
input[type="password"]:focus,
input[type="number"]:focus,
input[type="date"]:focus,
input[type="datetime-local"]:focus,
textarea:focus,
select:focus {
  border-color: var(--g-accent);
  box-shadow: 0 0 0 1px ${rgba(p.accent, 0.3)};
}

input[type="checkbox"] {
  border-color: var(--checkbox-border-color);
  border-radius: var(--checkbox-radius);
}

input[type="checkbox"]:checked {
  background-color: var(--checkbox-color);
  border-color: var(--checkbox-color);
}

.checkbox-container {
  background-color: ${mix(p.tabStrip, p.editorBg, 0.15)};
}

.checkbox-container.is-enabled {
  background-color: var(--interactive-accent);
}

.checkbox-container::after {
  background-color: ${p.editorFg};
}

.checkbox-container.is-enabled::after {
  background-color: #e8f5ee;
}

.tag {
  background-color: var(--tag-background);
  border: var(--tag-border-width) solid var(--tag-border-color);
  color: var(--tag-color);
}

.tag:hover {
  background-color: var(--tag-background-hover);
  border-color: var(--tag-border-color-hover);
  color: var(--tag-color-hover);
}

/* ==========================================================================
   Editor / CodeMirror
   ========================================================================== */

.markdown-source-view.mod-cm6 .cm-scroller {
  background-color: var(--background-primary);
  color: var(--text-normal);
}

.markdown-source-view.mod-cm6 .cm-content {
  caret-color: var(--g-accent);
}

.markdown-source-view.mod-cm6 .cm-line.cm-active {
  background-color: ${rgba(p.activeLine, 0.7)};
}

.markdown-source-view.mod-cm6 .cm-gutters {
  background-color: var(--g-bg-gutter);
  border-inline-end: 1px solid var(--background-modifier-border);
  color: var(--g-line-number) !important;
}

.markdown-source-view.mod-cm6 .cm-lineNumbers .cm-gutterElement {
  color: var(--g-line-number);
}

.markdown-source-view.mod-cm6 .cm-active .cm-gutterElement {
  color: var(--g-fg-ui);
}

.markdown-source-view.mod-cm6 .cm-cursor,
.markdown-source-view.mod-cm6 .cm-dropCursor {
  border-left: 2px solid var(--g-accent);
}

.markdown-source-view.mod-cm6 .cm-selectionBackground,
.markdown-source-view.mod-cm6 .cm-content ::selection,
.cm-s-obsidian .cm-selectionBackground {
  background-color: ${rgba(p.selection, 0.78)} !important;
}

.markdown-source-view.mod-cm6 .cm-selectionMatch {
  background-color: ${rgba(p.accent, 0.2)};
}

.cm-s-obsidian .cm-searchMatch,
.markdown-source-view.mod-cm6 .cm-searchMatch {
  background-color: ${p.highlight};
  outline: 1px solid ${rgba(p.accent, 0.35)};
}

.cm-s-obsidian .cm-searchMatch-selected,
.markdown-source-view.mod-cm6 .cm-searchMatch-selected {
  background-color: ${p.highlightActive};
}

.cm-s-obsidian .cm-formatting,
.markdown-source-view.mod-cm6 .cm-formatting {
  color: var(--g-fg-faint);
}

.cm-s-obsidian .cm-formatting-link,
.markdown-source-view.mod-cm6 .cm-formatting-link,
.cm-s-obsidian .cm-formatting-link-string,
.markdown-source-view.mod-cm6 .cm-formatting-link-string {
  color: var(--g-link);
}

.cm-s-obsidian .cm-hmd-frontmatter,
.markdown-source-view.mod-cm6 .cm-hmd-frontmatter {
  color: var(--g-fg-muted);
}

.cm-s-obsidian .cm-link,
.markdown-source-view.mod-cm6 .cm-link {
  color: var(--g-link);
}

.cm-s-obsidian .cm-url,
.markdown-source-view.mod-cm6 .cm-url {
  color: var(--g-link-external);
}

.cm-s-obsidian .cm-tag,
.markdown-source-view.mod-cm6 .cm-tag {
  color: var(--g-syntax-tag);
}

.cm-s-obsidian .cm-quote,
.markdown-source-view.mod-cm6 .cm-quote {
  color: var(--g-quote-color);
}

.cm-s-obsidian span.cm-inline-code,
.markdown-source-view.mod-cm6 .cm-inline-code {
  background-color: var(--code-background);
  color: var(--code-normal);
  border-radius: var(--radius-s);
  padding: 0 0.25em;
}

/* Code block rows in live preview */
.markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock {
  background-color: var(--code-background);
  color: var(--code-normal);
}

.markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock-begin,
.markdown-source-view.mod-cm6 .cm-line.HyperMD-codeblock-end {
  color: var(--code-comment);
}

/* ==========================================================================
   Syntax highlighting (live preview + reading view)
   ========================================================================== */

.cm-s-obsidian .cm-keyword,
.cm-s-obsidian .cm-operator,
.markdown-rendered .token.keyword,
.markdown-rendered .token.operator {
  color: var(--code-keyword);
}

.cm-s-obsidian .cm-atom,
.cm-s-obsidian .cm-number,
.markdown-rendered .token.boolean,
.markdown-rendered .token.number,
.markdown-rendered .token.constant {
  color: var(--code-value);
}

.cm-s-obsidian .cm-def,
.cm-s-obsidian .cm-variable-2,
.markdown-rendered .token.function {
  color: var(--code-function);
}

.cm-s-obsidian .cm-property,
.markdown-rendered .token.property,
.markdown-rendered .token.attr-name {
  color: var(--code-property);
}

.cm-s-obsidian .cm-variable,
.markdown-rendered .token.variable {
  color: var(--g-syntax-variable);
}

.cm-s-obsidian .cm-variable-3,
.cm-s-obsidian .cm-type,
.cm-s-obsidian .cm-qualifier,
.markdown-rendered .token.class-name,
.markdown-rendered .token.builtin {
  color: var(--g-syntax-type);
}

.cm-s-obsidian .cm-comment,
.markdown-rendered .token.comment {
  color: var(--code-comment);
  font-style: italic;
}

.cm-s-obsidian .cm-string,
.cm-s-obsidian .cm-string-2,
.markdown-rendered .token.string,
.markdown-rendered .token.char,
.markdown-rendered .token.regex {
  color: var(--code-string);
}

.cm-s-obsidian .cm-meta,
.markdown-rendered .token.meta,
.markdown-rendered .token.annotation {
  color: var(--g-syntax-metadata);
}

.cm-s-obsidian .cm-builtin,
.markdown-rendered .token.important {
  color: var(--code-important);
}

.cm-s-obsidian .cm-tag,
.markdown-rendered .token.tag {
  color: var(--code-tag);
}

.cm-s-obsidian .cm-attribute,
.markdown-rendered .token.attr-value {
  color: var(--g-syntax-metadata);
}

.cm-s-obsidian .cm-bracket,
.cm-s-obsidian .cm-punctuation,
.markdown-rendered .token.punctuation {
  color: var(--code-punctuation);
}

/* ==========================================================================
   Markdown rendering
   ========================================================================== */

.markdown-rendered {
  color: var(--text-normal);
}

.markdown-rendered h1,
.markdown-rendered h2,
.markdown-rendered h3,
.markdown-rendered h4,
.markdown-rendered h5,
.markdown-rendered h6 {
  line-height: 1.3;
}

/* Obsidian positions the heading fold arrow at the start of the heading text.
   Obsidian Toolkit adds a left border/padding to h2/h3, and the arrow lands on
   top of it. Keep those arrows in the left margin instead. */
.markdown-rendered h2 > .heading-collapse-indicator,
.markdown-rendered h3 > .heading-collapse-indicator {
  margin-inline-start: -40px;
}

.markdown-rendered a.internal-link,
.markdown-rendered a.external-link {
  text-decoration: none;
}

.markdown-rendered a.internal-link:hover,
.markdown-rendered a.external-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown-rendered a.internal-link.is-unresolved {
  text-decoration: underline;
  text-decoration-style: dotted;
}

.markdown-rendered blockquote {
  border-inline-start: var(--blockquote-border-thickness) solid var(--blockquote-border-color);
  background-color: var(--blockquote-background-color);
  border-radius: 0 var(--radius-s) var(--radius-s) 0;
  color: var(--blockquote-color);
}

.markdown-rendered blockquote > :first-child {
  margin-top: 0;
}

.markdown-rendered blockquote > :last-child {
  margin-bottom: 0;
}

.markdown-rendered hr {
  border-color: var(--hr-color);
}

.markdown-rendered mark {
  background-color: var(--text-highlight-bg);
  color: var(--text-normal);
}

.markdown-rendered pre {
  background-color: var(--code-background);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
}

.markdown-rendered pre code {
  background-color: transparent;
  border: none;
  color: var(--code-normal);
}

.markdown-rendered code:not(pre code) {
  background-color: var(--code-background);
  border: 1px solid ${rgba(p.accent, 0.12)};
  border-radius: var(--radius-s);
  color: var(--code-normal);
}

.markdown-rendered table {
  border-color: var(--table-border-color);
}

.markdown-rendered th {
  background-color: var(--table-header-background);
  color: var(--table-header-color);
  border-color: var(--table-border-color);
}

.markdown-rendered td {
  border-color: var(--table-border-color);
}

.markdown-rendered tbody tr:nth-child(even) {
  background-color: var(--table-row-alt-background);
}

.markdown-rendered tbody tr:hover {
  background-color: var(--table-row-background-hover);
}

.markdown-rendered .task-list-item-checkbox {
  border-color: var(--checkbox-border-color);
}

.markdown-rendered .task-list-item.is-checked {
  color: var(--checklist-done-color);
}

.markdown-rendered .task-list-item.is-checked a {
  color: var(--link-unresolved-color);
}

.markdown-rendered img {
  border-radius: var(--radius-s);
}

.markdown-rendered .internal-embed,
.markdown-rendered .markdown-embed {
  background-color: var(--embed-background);
  border-inline-start: var(--embed-border-left);
  border-radius: 0 var(--radius-s) var(--radius-s) 0;
}

.markdown-rendered .callout,
.callout {
  border-radius: var(--radius-m);
  border-inline-start-width: 4px;
}

.markdown-rendered .footnotes {
  border-top-color: var(--background-modifier-border);
  color: var(--text-muted);
}

.markdown-rendered .math {
  color: var(--text-normal);
}

/* Properties / frontmatter */
.metadata-container {
  background-color: ${rgba(p.panelBg, 0.22)};
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  /* The properties collapse chevron is positioned 22px to the left of the
     heading; the extra left padding keeps it inside our bordered card. */
  padding: 8px 12px 8px 30px;
}

.metadata-property-key {
  color: var(--metadata-label-text-color);
}

.metadata-property-value {
  color: var(--metadata-input-text-color);
}

.metadata-add-button {
  color: var(--text-accent);
}

/* Search panel */
.search-result-file-title {
  color: var(--text-normal);
}

.search-result-file-matches {
  color: var(--text-muted);
}

.search-result-file-matched-text {
  background-color: ${rgba(p.accent, 0.2)};
  color: #f1f4f6;
}

/* ==========================================================================
   Graph view
   ========================================================================== */

.graph-view.color-fill {
  color: var(--graph-node);
}

.graph-view.color-fill-focused {
  color: var(--graph-node-focused);
}

.graph-view.color-fill-tag {
  color: var(--graph-node-tag);
}

.graph-view.color-fill-attachment {
  color: var(--graph-node-attachment);
}

.graph-view.color-fill-unresolved {
  color: var(--graph-node-unresolved);
}

.graph-view.color-line {
  color: var(--graph-line);
}

.graph-view.color-text {
  color: var(--graph-text);
}

/* ==========================================================================
   Scrollbars and focus
   ========================================================================== */

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--g-scroll-thumb);
  border: 2px solid transparent;
  background-clip: content-box;
  border-radius: 6px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--g-scroll-thumb-hover);
}

::-webkit-scrollbar-corner {
  background: transparent;
}

:focus-visible {
  outline: 2px solid ${rgba(p.accent, 0.6)};
  outline-offset: 2px;
}

/* ==========================================================================
   Print / PDF export
   ========================================================================== */

@media print {
  body {
    --background-primary: #ffffff;
    --background-secondary: #ffffff;
    --text-normal: #1a1a1a;
    --text-muted: #555555;
    --text-faint: #777777;
    --text-accent: #00695c;
    --h1-color: #00695c;
    --h2-color: #2e7d6e;
    --h3-color: #6a3d75;
    --h4-color: #5c5c1f;
    --h5-color: #7a4a2b;
    --h6-color: #43611f;
    --code-background: #f4f6f4;
    --code-normal: #1a1a1a;
    --code-comment: #4e6a56;
    --code-keyword: #00695c;
    --code-function: #7b2d7f;
    --code-string: #5c5c1f;
    --code-value: #8a4b2a;
  }
}
`;

/* ------------------------------------------------------------------ */
/* output                                                              */
/* ------------------------------------------------------------------ */

const manifest = {
  name: NAME,
  version: VERSION,
  minAppVersion: "1.5.0",
  author: "Azmandios",
  authorUrl: "https://github.com/Azmandios/obsidian-gradianto",
};

fs.writeFileSync(path.join(ROOT, "theme.css"), css, "utf8");
fs.writeFileSync(path.join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`wrote theme.css (${css.split("\n").length} lines)`);
console.log(`wrote manifest.json (${NAME} ${VERSION})`);
