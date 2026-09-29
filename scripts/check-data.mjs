// Validates /data and prints the null-field checklist. Run: pnpm check
import { readFileSync } from "node:fs";
const j = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));
const countries = j("countries.json"), templates = j("templates.json"), refs = j("references.json"), centers = j("centers.json");
const ids = new Set(refs.references.map((r) => r.claim_id));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const errs = [], nulls = [];
const need = (id, where) => { if (!ids.has(id)) errs.push(`unknown claim_id ${id} in ${where}`); };

// Six section keys in panel order; one set of one-word titles shared by every template.
const KEYS = ["curiosity", "misconceptions", "attractions", "objections", "one_concept", "next_step"];
const BANNED = ["فضول", "أخطاء شائعة", "جذب", "شهادات", "مخاوف", "مزايا الإسلام", "ما يهم غير المسلمين", "لماذا يُسلمون", "شبهات", "أسلم الآن"];
const st = templates.meta.section_titles ?? {};
if (Object.keys(st).join() !== KEYS.join()) errs.push(`meta.section_titles keys must be ${KEYS.join(", ")}`);
for (const k of KEYS) {
  const s = st[k];
  if (!s?.title_ar || !s?.title_en) { errs.push(`meta.section_titles.${k} needs title_ar and title_en`); continue; }
  if (/\s/.test(s.title_ar.trim())) errs.push(`meta.section_titles.${k}.title_ar must be one word`);
  if (BANNED.some((b) => s.title_ar.includes(b))) errs.push(`meta.section_titles.${k}.title_ar is a banned heading`);
}
for (const t of Object.values(templates.templates))
  if (Object.keys(t.sections).join() !== KEYS.join()) errs.push(`${t.id} section keys changed`);

for (const t of Object.values(templates.templates)) {
  for (const [sec, items] of Object.entries(t.sections)) {
    if (sec === "one_concept") continue;
    for (const it of items) {
      for (const l of ["ar", "en"]) if (words(it[l]) > 18) errs.push(`${it.id}.${l} has ${words(it[l])} words (>18)`);
      it.claim_ids.forEach((c) => need(c, it.id));
    }
  }
  const oc = t.sections.one_concept;
  for (const l of ["ar", "en"]) { const n = words(oc[l]); if (n < 60 || n > 90) errs.push(`${t.id}.one_concept.${l} has ${n} words (60-90)`); }
  oc.claim_ids.forEach((c) => need(c, `${t.id}.one_concept`));
  if (!/[؀-ۿ]/.test(oc.ar)) errs.push(`${t.id} one_concept.ar not Arabic`);
}
for (const c of countries.countries) {
  if (c.year !== 2020) errs.push(`${c.iso3} year != 2020`);
  if (!templates.templates[c.content_template_id]) errs.push(`${c.iso3} bad template`);
  for (const [k, v] of Object.entries(c.pct)) if (v === null) nulls.push(`countries.${c.iso3}.pct.${k}`);
  for (const [k, v] of Object.entries(c.counts)) if (v === null) nulls.push(`countries.${c.iso3}.counts.${k}`);
}
for (const r of refs.references) {
  if (r.year === null) nulls.push(`references.${r.claim_id}.year`);
  if (r.published === null) nulls.push(`references.${r.claim_id}.published`);
  if (!/^https:\/\//.test(r.url)) errs.push(`${r.claim_id} url not https`);
}
if (centers.centers.length === 0) nulls.push("centers.centers (empty: no verified center yet)");
for (const t of Object.values(templates.templates)) if (t.sections.attractions.length === 0) nulls.push(`templates.${t.id}.attractions (empty by design)`);

console.log(`claims: ${ids.size}, countries: ${countries.countries.length}, templates: ${Object.keys(templates.templates).length}`);
console.log(`\nNULL FIELD CHECKLIST (${nulls.length}):`);
nulls.forEach((n) => console.log(`  [ ] ${n}`));
if (errs.length) { console.error(`\nERRORS (${errs.length}):`); errs.forEach((e) => console.error("  - " + e)); process.exit(1); }
console.log("\nData checks passed.");
