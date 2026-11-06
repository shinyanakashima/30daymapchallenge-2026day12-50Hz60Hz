// Assigns 50 / 60 Hz to every N03 municipality using scripts/hz-japan.csv
// (prefecture defaults, then municipality overrides). Prints counts.
import { readFileSync, writeFileSync } from "node:fs";

const [src, dst] = process.argv.slice(2);
const rows = readFileSync(new URL("./hz-japan.csv", import.meta.url), "utf8")
  .trim().split("\n").slice(1).map((l) => l.split(","));
const pref = new Map(), muni = new Map();
for (const [level, key, hz] of rows) (level === "pref" ? pref : muni).set(key, hz);

const geo = JSON.parse(readFileSync(src, "utf8"));
const count = { 50: 0, 60: 0, none: 0 };
for (const f of geo.features) {
  const p = f.properties;
  let hz = muni.has(p.code) ? muni.get(p.code) : (pref.has(p.pref) ? pref.get(p.pref) : pref.get("*"));
  p.hz = hz || null;
  count[hz || "none"]++;
}
const used = [...muni.keys()].filter((k) => !geo.features.some((f) => f.properties.code === k));
if (used.length) throw new Error("unknown codes: " + used.join(","));
writeFileSync(dst, JSON.stringify(geo));
console.log("municipalities:", geo.features.length, "50Hz:", count[50], "60Hz:", count[60], "not assigned:", count.none);
