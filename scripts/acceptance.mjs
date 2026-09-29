// Acceptance checks against a running server. Usage: pnpm dev (or pnpm start) then pnpm accept
import { readFileSync } from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const countries = JSON.parse(readFileSync(new URL("../data/countries.json", import.meta.url), "utf8")).countries;
const results = [];
const box = (name, ok, info = "") => { results.push({ name, ok }); console.log(`${ok ? "[x]" : "[ ]"} ${name}${info ? `  — ${info}` : ""}`); };
const get = async (p, lang) => { const r = await fetch(BASE + p, { headers: lang ? { cookie: `lang=${lang}` } : {} }); return { status: r.status, html: await r.text() }; };
const post = async (body, raw) => { const r = await fetch(BASE + "/api/journey", { method: "POST", headers: { "content-type": "application/json" }, body: raw ?? JSON.stringify(body) }); return { status: r.status, json: await r.json().catch(() => null) }; };

// 1. 12 countries open
const pages = {};
let open = 0;
for (const c of countries) {
  const r = await get(`/country/${c.iso3}`);
  pages[c.iso3] = r.html;
  if (r.status === 200 && r.html.includes(c.name.ar) && r.html.includes('data-testid="tabs"')) open++;
}
box("12 countries open", open === 12, `${open}/12`);

// 2. journey differs IND+hindu vs FRA+unaffiliated (and explicit wins)
const t0 = Date.now();
const a = await post({ iso3: "IND", background: "hindu" });
const b = await post({ iso3: "FRA", background: "unaffiliated" });
const ms = Date.now() - t0;
const diff = a.json?.template_id === "hindu" && b.json?.template_id === "unaffiliated" &&
  JSON.stringify(a.json.headlines) !== JSON.stringify(b.json.headlines) && a.json.detail.en !== b.json.detail.en;
const hlOk = [a.json, b.json].every((j) => j.headlines.length >= 5 && j.headlines.length <= 8);
const expl = await post({ iso3: "FRA", background: "hindu" });
box("/api/journey differs for IND+hindu vs FRA+unaffiliated", diff && hlOk && expl.json?.template_id === "hindu" && expl.json?.background_source === "explicit",
  `${a.json?.template_id}/${b.json?.template_id}, ${a.json?.headlines.length}+${b.json?.headlines.length} headlines, explicit wins, ${ms}ms`);

// 3. hadd abstains (and false positives do not)
const q1 = await post({ iso3: "FRA", question: "what is the hadd for theft" });
const q2 = await post({ iso3: "EGY", question: "ما حد السرقة؟" });
const q3 = await post({ iso3: "IND", question: "what is tawhid?" });
const q4 = await post({ iso3: "IND", question: "هل الله واحد؟" });
box("\"what is the hadd for theft\" abstains", q1.json?.abstain_flag === true && !!q1.json?.referral?.en && q2.json?.abstain_flag === true && q3.json?.abstain_flag === false && q4.json?.abstain_flag === false,
  `en=${q1.json?.abstain_topic}, ar=${q2.json?.abstain_topic}, controls=${q3.json?.abstain_flag}/${q4.json?.abstain_flag}`);

// 4. every pct links to /references
let pctOk = true, pctCount = 0;
for (const c of countries) {
  const anchors = [...pages[c.iso3].matchAll(/<a\b[^>]*data-pct="[^"]*"[^>]*>/g)].map((m) => m[0]);
  const expected = Object.values(c.pct).filter((v) => v !== null).length;
  pctCount += anchors.length;
  if (anchors.length !== expected || !anchors.every((x) => /href="\/references#pew-country-table-2020"/.test(x))) pctOk = false;
}
const home = await get("/");
const worldAnchors = [...home.html.matchAll(/<a\b[^>]*data-pct="[^"]*"[^>]*>/g)].map((m) => m[0]);
pctOk &&= worldAnchors.length === 7 && worldAnchors.every((x) => x.includes('href="/references#pew-world-2020"'));
const refs = await get("/references");
pctOk &&= refs.html.includes('id="pew-country-table-2020"') && refs.html.includes('id="pew-world-2020"');
box("every pct links to /references", pctOk, `${pctCount} country + ${worldAnchors.length} world figures`);

// 5. missing data does not crash
const miss = pages.IND.includes('data-missing="true"') && pages.IND.includes("لا رقم مؤكد") && pages.IND.includes('href="/method"');
const unk = await post({ iso3: "ZZZ" });
const badBg = await post({ iso3: "FRA", background: "martian" });
const badJson = await post(null, "{not json");
const badPage = await get("/country/ZZZ");
const garbageBg = await get("/country/JPN?bg=garbage");
const apiMissing = (await post({ iso3: "THA" })).json?.missing?.length > 0;
box("missing data does not crash", miss && apiMissing && unk.status === 404 && badBg.status === 400 && badJson.status === 400 && badPage.status === 404 && garbageBg.status === 200,
  `unknown=${unk.status}, badBg=${badBg.status}, badJson=${badJson.status}, page404=${badPage.status}, garbageBg=${garbageBg.status}`);

// 6. Arabic RTL
const en = await get("/", "en");
box("Arabic RTL readable", /<html[^>]*lang="ar"[^>]*dir="rtl"/.test(home.html) && /<html[^>]*lang="en"[^>]*dir="ltr"/.test(en.html) && home.html.includes("أطلس الدين الإسلامي"), "default ar/rtl, en toggle ltr");

// 7. mobile list fallback (server-rendered list, no WebGL/canvas)
const links = (home.html.match(/href="\/country\/[A-Z]{3}"/g) ?? []).length;
box("mobile list fallback", links === 12 && !/<canvas|webgl/i.test(home.html) && home.html.includes('name="viewport"'), `${links} server-rendered links, no canvas`);

// 8. docs
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
box("pnpm install && pnpm dev documented", readme.includes("pnpm install") && readme.includes("pnpm dev"));

// 9–12. Six one-word section titles (amendment)
const TABS = [["curiosity", "المدخل", "Entry"], ["misconceptions", "التصوّر", "Impressions"], ["attractions", "الوقفة", "What holds"],
  ["objections", "التحفّظ", "Reservations"], ["one_concept", "الأصل", "One idea"], ["next_step", "المرجع", "Sources"]];
const BANNED = ["فضول", "أخطاء شائعة", "جذب", "شهادات", "مخاوف", "مزايا الإسلام", "ما يهم غير المسلمين", "لماذا يُسلمون", "شبهات", "أسلم الآن"];
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
const tabsOf = (html) => [...html.matchAll(/<button[^>]*role="tab"[^>]*>([\s\S]*?)<\/button>/g)].map((m) => text(m[1]));
const headingsOf = (html) => [...html.matchAll(/<(h[1-6]|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => text(m[2]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const enPages = {};
for (const c of countries) enPages[c.iso3] = (await get(`/country/${c.iso3}`, "en")).html;
const arOk = countries.filter((c) => same(tabsOf(pages[c.iso3]), TABS.map((x) => x[1]))).length;
const enOk = countries.filter((c) => same(tabsOf(enPages[c.iso3]), TABS.map((x) => x[2]))).length;
box("six tabs exactly those Arabic nouns", arOk === 12 && enOk === 12, `ar ${arOk}/12, en ${enOk}/12: ${tabsOf(pages.IND).join("، ")}`);

const routes = ["/", "/references", "/centers", "/method", "/about", "/country/ZZZ", ...countries.map((c) => `/country/${c.iso3}`)];
const bad = [];
for (const lang of ["ar", "en"]) for (const p of routes) {
  const html = p.startsWith("/country/") && pages[p.slice(9)] ? (lang === "ar" ? pages : enPages)[p.slice(9)] : (await get(p, lang)).html;
  for (const h of headingsOf(html))
    if (/[?؟.!:]$/.test(h) || h.includes(":") || BANNED.some((b) => h.includes(b))) bad.push(`${lang} ${p}: «${h}»`);
}
box("no sentence-fragment heading remains", bad.length === 0, bad.length ? bad.slice(0, 4).join(" | ") : `${routes.length * 2} pages scanned`);

const tpl = JSON.parse(readFileSync(new URL("../data/templates.json", import.meta.url), "utf8"));
const keysOk = Object.values(tpl.templates).every((t) => same(Object.keys(t.sections), TABS.map((x) => x[0]))) &&
  same(Object.keys(tpl.meta.section_titles), TABS.map((x) => x[0])) &&
  TABS.every(([k, ar, en]) => tpl.meta.section_titles[k].title_ar === ar && tpl.meta.section_titles[k].title_en === en);
box("keys unchanged in /data", keysOk, "5 templates × 6 English keys; only title_ar/title_en added");

const ih = (await post({ iso3: "IND", background: "hindu" })).json, fu = (await post({ iso3: "FRA", background: "unaffiliated" })).json;
const body = ({ key, title, ...rest }) => JSON.stringify(rest);
const titlesSame = same(ih.tabs.map((t) => t.title), fu.tabs.map((t) => t.title)) && same(ih.tabs.map((t) => t.title.ar), TABS.map((x) => x[1]));
const bodiesDiffer = ih.tabs.filter((t, i) => body(t) !== body(fu.tabs[i])).length;
box("IND+hindu and FRA+unaffiliated differ in body, not in tab names", titlesSame && bodiesDiffer === 6, `titles identical, ${bodiesDiffer}/6 bodies differ`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log("FAILED:", failed.map((f) => f.name).join("; ")); process.exit(1); }
