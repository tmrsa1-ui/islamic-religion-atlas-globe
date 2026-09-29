import { detectAbstain, type AbstainTopic } from "./abstain";
import {
  GROUPS, MISSING, centersData, countryMeta, findCountry, groupLabel, sectionTitle, templateMeta, templates,
  type Center, type Country, type GroupKey, type Item, type L,
} from "./data";

export const BACKGROUNDS = ["christian", "unaffiliated", "hindu", "buddhist_ea", "unspecified"] as const;
export type Background = (typeof BACKGROUNDS)[number];
export const isBackground = (v: unknown): v is Background => typeof v === "string" && (BACKGROUNDS as readonly string[]).includes(v);

export type Headline = { id: string; ar: string; en: string; claim_ids: string[]; href?: string };
const LIST_KEYS = ["curiosity", "misconceptions", "attractions", "objections"] as const;
// The six tabs in panel order. Titles are fixed; المرجع carries citations and verified centers only.
export type Tab =
  | { key: (typeof LIST_KEYS)[number]; title: L; items: Headline[] }
  | { key: "one_concept"; title: L; concept: Journey["detail"] }
  | { key: "next_step"; title: L; claim_ids: string[]; centers: Center[] };
export type JourneyInput = { iso3?: unknown; background?: unknown; question?: unknown };
export type Journey = {
  iso3: string;
  country_name: L;
  template_id: string | null;
  background_source: "explicit" | "country";
  badge: L;
  headlines: Headline[];
  detail: { title: L; ar: string; en: string; claim_ids: string[]; word_count: { ar: number; en: number } } | null;
  claim_ids: string[];
  centers: Center[];
  tabs: Tab[];
  abstain_flag: boolean;
  abstain_topic: AbstainTopic | null;
  referral: L | null;
  question_note: L | null;
  figures: { key: GroupKey; label: L; pct: number | null; year: 2020; display: L }[];
  missing: { field: string; label: L; method: "/method" }[];
  source: { publisher: L; year: number; published: string; url: string; claim_id: string };
  inference_policy: L;
};
export type JourneyResult = { ok: true; data: Journey } | { ok: false; status: number; error: L };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const fmt = (n: number) => `${n.toFixed(1)}%`;
const INFERENCE: L = {
  ar: "لا نستنتج دين الزائر من لغته أو سلوكه أو عنوانه الشبكي؛ الإطار من إحصاءات البلد أو من اختيارك الصريح.",
  en: "We never infer a visitor's religion from language, behavior or IP; framing comes from country statistics or your explicit choice.",
};
const QUESTION_NOTE: L = {
  ar: "هذا الأطلس يجيب من قوالبه ومصادره فقط، ولا يولّد إجابات حرة. راجع الأقسام الستة أعلاه.",
  en: "This atlas answers only from its templates and sources; it does not generate free-form answers. See the six tabs above.",
};

function countryHeadline(c: Country): Headline {
  const top = GROUPS.map((k) => [k, c.pct[k]] as const)
    .filter((e): e is readonly [GroupKey, number] => typeof e[1] === "number")
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  const list = (lang: "ar" | "en") =>
    top.length ? top.map(([k, v]) => `${groupLabel(k)[lang]} ${fmt(v)}`).join(lang === "ar" ? "، " : ", ") : MISSING[lang];
  const tpl = templateMeta.country_headline as L;
  return {
    id: `country-${c.iso3}`,
    ar: tpl.ar.replace("{country}", c.name.ar).replace("{list}", list("ar")),
    en: tpl.en.replace("{country}", c.name.en).replace("{list}", list("en")),
    claim_ids: ["pew-country-table-2020"],
  };
}

export function buildJourney(input: JourneyInput): JourneyResult {
  const iso3 = typeof input.iso3 === "string" ? input.iso3.trim().toUpperCase() : "";
  const country = iso3 ? findCountry(iso3) : undefined;
  if (!country) return { ok: false, status: 404, error: { ar: "البلد غير موجود في هذا الأطلس.", en: "Country not in this atlas." } };
  if (input.background !== undefined && input.background !== null && !isBackground(input.background))
    return { ok: false, status: 400, error: { ar: "خلفية غير معروفة.", en: `Unknown background. Use one of: ${BACKGROUNDS.join(", ")}.` } };

  const explicit = isBackground(input.background) && input.background !== "unspecified";
  const templateId = explicit ? (input.background as string) : country.content_template_id;
  const tpl = templates[templateId];

  const badge: L = explicit && tpl
    ? { ar: `إطار اخترته أنت صراحةً: ${tpl.label.ar}`, en: `Framing you chose explicitly: ${tpl.label.en}` }
    : country.badge ?? tpl?.default_badge ?? MISSING;

  const headlines: Headline[] = [countryHeadline(country)];
  let detail: Journey["detail"] = null;
  if (tpl) {
    const s = tpl.sections;
    const pool = [s.curiosity[0], s.misconceptions[0], s.attractions[0], s.objections[0], s.attractions[1], s.curiosity[1], s.objections[1], s.misconceptions[1]]
      .filter((x): x is Item => Boolean(x));
    headlines.push(...pool.slice(0, 6));
    if (s.next_step[0]) headlines.push(s.next_step[0]);
    const oc = s.one_concept;
    detail = { title: oc.title, ar: oc.ar, en: oc.en, claim_ids: oc.claim_ids, word_count: { ar: words(oc.ar), en: words(oc.en) } };
  }

  const lists = LIST_KEYS.map((key) => ({ key, title: sectionTitle(key), items: tpl ? tpl.sections[key] : [] }));
  const claim_ids = [...new Set([
    "pew-country-table-2020", ...headlines.flatMap((h) => h.claim_ids),
    ...lists.flatMap((l) => l.items.flatMap((i) => i.claim_ids)), ...(detail?.claim_ids ?? []),
  ])];
  const centers = centersData.centers.filter((c) => c.iso3 === country.iso3 && /^https:\/\//.test(c.official_url));
  const tabs: Tab[] = [
    ...lists,
    { key: "one_concept", title: sectionTitle("one_concept"), concept: detail },
    { key: "next_step", title: sectionTitle("next_step"), claim_ids, centers },
  ];
  const topic = detectAbstain(typeof input.question === "string" ? input.question.slice(0, 500) : null);
  const asked = typeof input.question === "string" && input.question.trim().length > 0;

  const figures = GROUPS.map((k) => {
    const v = country.pct[k];
    return { key: k, label: groupLabel(k), pct: v, year: 2020 as const, display: v === null ? MISSING : { ar: fmt(v), en: fmt(v) } };
  });

  return {
    ok: true,
    data: {
      iso3: country.iso3,
      country_name: country.name,
      template_id: tpl ? templateId : null,
      background_source: explicit ? "explicit" : "country",
      badge,
      headlines: headlines.slice(0, 8),
      detail,
      claim_ids,
      centers,
      tabs,
      abstain_flag: topic !== null,
      abstain_topic: topic,
      referral: topic ? (templateMeta.referral as L) : null,
      question_note: asked && !topic ? QUESTION_NOTE : null,
      figures,
      missing: figures.filter((f) => f.pct === null).map((f) => ({ field: `pct.${f.key}`, label: MISSING, method: "/method" as const })),
      source: { publisher: countryMeta.publisher, year: countryMeta.year, published: countryMeta.published, url: countryMeta.url, claim_id: countryMeta.claim_id },
      inference_policy: INFERENCE,
    },
  };
}
