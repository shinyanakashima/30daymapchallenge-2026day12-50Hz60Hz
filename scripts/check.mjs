// Opens every view/language combination, collects console errors and failed requests,
// exercises the view switch, markers, zoom presets and sound buttons, and writes screenshots.
// Usage: node scripts/check.mjs [baseURL]   (default: serves the repository root on port 8123)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = new URL("..", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

let server = null;
let base = process.argv[2];
if (!base) {
  server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((r) => server.listen(8123, r));
  base = "http://localhost:8123/";
}

const combos = [["py", "es"], ["py", "en"], ["jp", "en"], ["jp", "ja"]];
const browser = await chromium.launch();
let failed = 0;

for (const [view, lang] of combos) {
  for (const vp of [{ width: 1200, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    const problems = [];
    page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });
    page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
    page.on("response", (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
    page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));

    await page.goto(`${base}?view=${view}&lang=${lang}`, { waitUntil: "networkidle" });
    await page.waitForSelector("html.ready");
    await page.waitForTimeout(600);

    const htmlLang = await page.getAttribute("html", "lang");
    if (htmlLang !== lang) problems.push(`html lang ${htmlLang} != ${lang}`);
    const title = await page.textContent("#view-title");
    if (!title.trim()) problems.push("empty title");

    // marker popup
    const markers = await page.$$(".marker[data-id]");
    if (!markers.length) problems.push("no markers");
    for (const m of markers) {
      if (await m.isVisible()) { await m.click({ force: true }); break; }
    }
    if (await page.isHidden("#popup")) problems.push("popup did not open");

    // zoom presets
    const presets = await page.$$("#zoom-presets button");
    for (let i = presets.length - 1; i >= 0; i--) { await presets[i].click(); await page.waitForTimeout(1600); }

    // sound buttons (toggle on/off)
    await page.click('.tone[data-hz="50"]');
    await page.click('.tone[data-hz="60"]');
    await page.click('.tone[data-hz="60"]');

    // map layers are drawn and the wave layers have their masks
    const nonBlank = await page.evaluate(() => {
      let lit = 0;
      for (const id of ["map", "top"]) {
        const c = document.getElementById(id);
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) lit++;
      }
      return lit;
    });
    const masked = await page.evaluate(() => [...document.querySelectorAll("#waves .wave")]
      .filter((w) => w.style.visibility !== "hidden" && /blob:/.test(w.style.maskImage || w.style.webkitMaskImage)).length);
    if (masked < 2) problems.push("wave layers missing");
    if (nonBlank < 500) problems.push("canvas looks blank");

    // view switch keeps/changes language
    const other = view === "py" ? "jp" : "py";
    await page.click(`#view-switch button[data-view="${other}"]`);
    await page.waitForTimeout(400);
    const url = new URL(page.url());
    const expectLang = (other === "py" ? ["es", "en"] : ["en", "ja"]).includes(lang) ? lang : "en";
    if (url.searchParams.get("view") !== other || url.searchParams.get("lang") !== expectLang) problems.push(`switch -> ${url.search}`);
    if ((await page.getAttribute("html", "lang")) !== expectLang) problems.push("html lang after switch");

    const tag = `${view}/${lang} ${vp.width}x${vp.height}`;
    if (problems.length) { failed++; console.log(`NG ${tag}\n  ` + problems.join("\n  ")); }
    else console.log(`OK ${tag}`);
    await page.close();
  }
}

// screenshots (1200x900)
for (const [view, lang, file] of [["py", "es", "docs/screenshot.png"], ["jp", "en", "docs/screenshot-japan.png"]]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${base}?view=${view}&lang=${lang}`, { waitUntil: "networkidle" });
  await page.waitForSelector("html.ready");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(root, file) });
  await page.close();
}

await browser.close();
if (server) server.close();
console.log(failed ? `${failed} combination(s) with problems` : "all combinations OK");
process.exit(failed ? 1 : 0);
