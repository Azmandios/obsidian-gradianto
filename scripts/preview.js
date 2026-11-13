/* Renders the generated Obsidian theme into a static HTML mock of the app so
 * the palette can be eyeballed without opening a vault.
 *
 * Usage: node scripts/preview.js  ->  preview.html
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const themeCss = fs.readFileSync(path.join(root, "theme.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${manifest.name} — Obsidian preview</title>
<style>
${themeCss}

/* ---- mock app chrome (preview only) ---------------------------------- */
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: #08110f;
  padding: 28px;
  font-family: -apple-system, "Segoe UI", Inter, sans-serif;
  font-size: 14px;
  color: var(--text-normal);
}
.app {
  max-width: 1140px;
  margin: 0 auto;
  background: var(--background-primary);
  border: 1px solid var(--g-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}
.titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 12px;
  background: var(--titlebar-background);
  border-bottom: 1px solid var(--titlebar-border-color);
  color: var(--titlebar-text-color);
  font-size: 12px;
}
.titlebar .name { color: var(--titlebar-text-color-focused); font-weight: 600; }
.titlebar .vault { margin-left: auto; color: var(--text-faint); }
.dots { display: flex; gap: 6px; }
.dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--g-border-soft); }
.workspace { display: flex; min-height: 660px; }
.ribbon {
  width: 44px;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: var(--ribbon-background);
  border-right: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  font-size: 15px;
}
.ribbon .active { color: var(--g-accent); }
.sidebar {
  width: 246px;
  background: var(--background-secondary);
  border-right: 1px solid var(--background-modifier-border);
}
.sidebar-head {
  padding: 12px 16px 6px;
  color: var(--text-faint);
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.tree { padding: 0 8px 12px; }
.tree-item {
  padding: 5px 8px;
  border-radius: 3px;
  color: var(--nav-item-color);
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-item:hover { background: var(--nav-item-background-hover); color: var(--nav-item-color-hover); }
.tree-item.active { background: var(--nav-item-background-active); color: var(--nav-item-color-active); }
.tree-item.indent { padding-left: 26px; }
.tree-item.muted { color: var(--text-muted); }
.tree-item .m { color: var(--text-faint); margin-left: 6px; }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--background-primary); }
.tabs {
  display: flex;
  background: var(--tab-container-background);
  border-bottom: 1px solid var(--background-modifier-border);
}
.tab {
  padding: 9px 18px;
  color: var(--tab-text-color);
  font-size: 12px;
  border-right: 1px solid var(--background-modifier-border);
}
.tab.active { background: var(--tab-background-active); color: var(--tab-text-color-active); }
.tab .x { color: var(--text-faint); margin-left: 8px; }
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  font-size: 12px;
}
.note { padding: 26px 46px 40px; max-width: 820px; }
.note p { line-height: var(--line-height-normal); margin: 0 0 12px; }
.inline-title { margin: 0 0 16px; font-size: 28px; line-height: 1.2; color: var(--inline-title-color); font-weight: 600; }
h1, h2, h3 { line-height: 1.3; margin: 24px 0 10px; font-weight: 600; }
h1 { font-size: 22px; color: var(--h1-color); }
h2 { font-size: 19px; color: var(--h2-color); }
h3 { font-size: 16px; color: var(--h3-color); }
a { text-decoration: none; }
a.internal-link { color: var(--link-color); }
a.internal-link:hover { color: var(--link-color-hover); text-decoration: underline; }
a.external-link { color: var(--link-external-color); }
a.unresolved { color: var(--link-unresolved-color); text-decoration: underline dotted; }
.tag {
  display: inline-block;
  padding: 1px 7px;
  border-radius: var(--tag-radius);
  background: var(--tag-background);
  border: 1px solid var(--tag-border-color);
  color: var(--tag-color);
  font-size: 12px;
}
.meta {
  margin: 0 0 22px;
  padding: 9px 12px;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: rgba(32, 64, 63, 0.22);
  font-size: 12px;
}
.meta .k { color: var(--metadata-label-text-color); display: inline-block; width: 84px; }
.meta .v { color: var(--metadata-input-text-color); }
blockquote {
  margin: 14px 0;
  padding: 6px 16px;
  border-left: var(--blockquote-border-thickness) solid var(--blockquote-border-color);
  background: var(--blockquote-background-color);
  border-radius: 0 var(--radius-s) var(--radius-s) 0;
  color: var(--blockquote-color);
}
.callout {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid color-mix(in oklch, var(--callout-info) 35%, transparent);
  border-radius: var(--radius-m);
  background: color-mix(in oklch, var(--callout-info) 10%, transparent);
}
.callout-title { color: var(--callout-info); font-weight: 600; margin-bottom: 6px; }
.callout p:last-child { margin-bottom: 0; }
ul { margin: 8px 0 14px; padding-left: 22px; }
li { margin: 5px 0; }
li::marker { color: var(--list-marker-color); }
.task { list-style: none; margin-left: -20px; }
.box {
  display: inline-block;
  width: 13px;
  height: 13px;
  margin-right: 8px;
  vertical-align: -2px;
  border-radius: var(--checkbox-radius);
  border: 1px solid var(--checkbox-border-color);
}
.box.on { background: var(--checkbox-color); border-color: var(--checkbox-color); }
.box.on::after { content: "✓"; display: block; color: var(--checkbox-marker-color); font-size: 10px; line-height: 11px; text-align: center; }
.done { color: var(--checklist-done-color); text-decoration: line-through; }
code.inline {
  padding: 1px 5px;
  border-radius: var(--radius-s);
  background: var(--code-background);
  border: 1px solid rgba(96, 207, 146, 0.12);
  font-family: var(--font-monospace-theme);
  font-size: 12.5px;
  color: var(--code-normal);
}
pre {
  margin: 16px 0;
  padding: 14px 16px;
  overflow: auto;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--code-background);
  font-family: var(--font-monospace-theme);
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--code-normal);
}
.kw { color: var(--code-keyword); }
.fn { color: var(--code-function); }
.str { color: var(--code-string); }
.num { color: var(--code-value); }
.com { color: var(--code-comment); font-style: italic; }
.prop { color: var(--code-property); }
.pun { color: var(--code-punctuation); }
.op { color: var(--code-operator); }
.typ { color: var(--g-syntax-type); }
.var { color: var(--g-syntax-variable); }
.tagx { color: var(--code-tag); }
table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
th, td { padding: 7px 10px; border: 1px solid var(--table-border-color); text-align: left; }
th { background: var(--table-header-background); color: var(--table-header-color); }
tbody tr:nth-child(even) { background: var(--table-row-alt-background); }
hr { border: none; border-top: 1px solid var(--hr-color); margin: 22px 0; }
.status {
  display: flex;
  justify-content: space-between;
  padding: 5px 14px;
  background: var(--status-bar-background);
  border-top: 1px solid var(--status-bar-border-color);
  color: var(--status-bar-text-color);
  font-size: 11px;
}
@media (max-width: 800px) {
  body { padding: 10px; }
  .sidebar, .ribbon { display: none; }
  .note { padding: 20px; }
}
</style>
</head>
<body>
<div class="app">
  <div class="titlebar">
    <span class="dots"><i></i><i></i><i></i></span>
    <span class="name">Obsidian</span>
    <span>— ${manifest.name}</span>
    <span class="vault">Notes · Gradianto Nature Green</span>
  </div>
  <div class="workspace">
    <div class="ribbon">
      <span>⌂</span>
      <span>🔍</span>
      <span>✦</span>
      <span class="active">▤</span>
      <span>⚙</span>
    </div>
    <aside class="sidebar">
      <div class="sidebar-head">Vault</div>
      <div class="tree">
        <div class="tree-item">▾ Notes</div>
        <div class="tree-item indent active">Gradianto port<span class="m">●</span></div>
        <div class="tree-item indent">Daily note</div>
        <div class="tree-item indent muted">Roadmap</div>
        <div class="tree-item">▸ Projects</div>
        <div class="tree-item">▸ Archive</div>
        <div class="tree-item muted">Templates</div>
      </div>
      <div class="sidebar-head">Tags</div>
      <div class="tree">
        <div class="tree-item"><span class="tag">#theme</span></div>
        <div class="tree-item"><span class="tag">#obsidian</span></div>
      </div>
    </aside>
    <main class="main">
      <div class="tabs">
        <div class="tab active">Gradianto port <span class="x">×</span></div>
        <div class="tab">Daily note</div>
        <div class="tab">Roadmap</div>
      </div>
      <div class="view-header">
        <span>Notes / Gradianto port</span>
        <span>Reading view</span>
      </div>
      <div class="note">
        <h1 class="inline-title">Gradianto Nature Green</h1>
        <div class="meta">
          <div><span class="k">tags</span><span class="v"><span class="tag">#theme</span> <span class="tag">#obsidian</span></span></div>
          <div><span class="k">status</span><span class="v">ready to try</span></div>
          <div><span class="k">source</span><span class="v"><a class="external-link" href="https://github.com/thvardhan/Gradianto">thvardhan/Gradianto</a></span></div>
        </div>
        <p>
          Порт темы <a class="internal-link" href="#">Gradianto</a> для Obsidian.
          Палитра взята из JetBrains-схемы, поэтому подсветка совпадает с IDE:
          <span class="tagx">ключевые слова</span> бирюзовые, строки оливковые,
          функции фуксия, типы жёлто-зелёные.
        </p>
        <h2>Заголовок второго уровня</h2>
        <p>
          Ссылки бывают <a class="internal-link" href="#">внутренние</a> и
          <a class="external-link" href="#">внешние</a>, а ещё
          <a class="unresolved" href="#">неразрешённые</a>. Инлайн-код выглядит так:
          <code class="inline">--interactive-accent: #006448</code>.
        </p>
        <blockquote>
          Градиент — это не только заливка. Это ступени: фон приложения, панель,
          вкладки и редактор.
        </blockquote>
        <h3>Чек-лист</h3>
        <ul>
          <li class="task"><span class="box on"></span><span class="done">Собрать тему из JetBrains-схемы</span></li>
          <li class="task"><span class="box"></span>Проверить в своём vault</li>
          <li class="task"><span class="box"></span>Настроить под плагины</li>
        </ul>
        <div class="callout">
          <div class="callout-title">Информация</div>
          <p>Callout использует цвет <code class="inline">--callout-info</code>, как в стандартной теме Obsidian.</p>
        </div>
        <table>
          <thead><tr><th>Элемент</th><th>Цвет</th><th>Источник</th></tr></thead>
          <tbody>
            <tr><td>Редактор</td><td>#132623</td><td>TEXT / CONSOLE_BACKGROUND_KEY</td></tr>
            <tr><td>Панель</td><td>#20403f</td><td>Tree.background</td></tr>
            <tr><td>Акцент</td><td>#60cf92</td><td>ProgressBar.progressColor</td></tr>
          </tbody>
        </table>
        <h3>Код</h3>
<pre><code><span class="com">// Gradianto Nature Green for Obsidian</span>
<span class="kw">import</span> { <span class="fn">createServer</span> } <span class="kw">from</span> <span class="str">"node:http"</span>;

<span class="kw">interface</span> <span class="typ">Theme</span> {
  <span class="prop">name</span><span class="pun">:</span> <span class="typ">string</span>;
  <span class="prop">colors</span><span class="pun">:</span> <span class="typ">string</span><span class="pun">[]</span>;
}

<span class="kw">const</span> <span class="var">accent</span> <span class="op">=</span> <span class="str">"#60cf92"</span>;
<span class="kw">const</span> <span class="var">count</span> <span class="op">=</span> <span class="num">42</span>;
<span class="kw">const</span> <span class="var">enabled</span> <span class="op">=</span> <span class="num">true</span>;

<span class="kw">export</span> <span class="kw">async</span> <span class="kw">function</span> <span class="fn">loadTheme</span><span class="pun">(</span><span class="prop">id</span><span class="pun">:</span> <span class="typ">string</span><span class="pun">)</span> {
  <span class="kw">return</span> <span class="kw">await</span> <span class="fn">fetch</span><span class="pun">(</span><span class="str">\`/api/themes/\${id}\`</span><span class="pun">)</span>;
}</code></pre>
        <hr>
        <p>Текст после разделителя. Проверьте выделение, курсор и активную строку в самом Obsidian.</p>
      </div>
      <div class="status">
        <span>⎇ main · 3 changes</span>
        <span>${manifest.name} v${manifest.version} · Reading view</span>
      </div>
    </main>
  </div>
</div>
</body>
</html>
`;

fs.writeFileSync(path.join(root, "preview.html"), html, "utf8");
console.log("wrote preview.html");
