import countriesJson from "@/data/countries.json";
import templatesJson from "@/data/templates.json";
import referencesJson from "@/data/references.json";
import centersJson from "@/data/centers.json";
import worldJson from "@/data/world_2020_pew.json";

export type Lang = "ar" | "en";
export type L = { ar: string; en: string };
export const GROUPS = ["christian", "muslim", "unaffiliated", "hindu", "buddhist", "jewish", "other"] as const;
export type GroupKey = (typeof GROUPS)[number];

export type Count = { value: number; label: L } | null;
export type Country = {
  iso3: string; name: L; year: number; content_template_id: string; badge: L | null;
  pct: Record<GroupKey, number | null>; counts: Record<string, Count>;
};
export type Item = { id: string; ar: string; en: string; claim_ids: string[]; href?: string };
export type Concept = { title: L; ar: string; en: string; claim_ids: string[] };
export type Template = {
  id: string; label: L; default_badge: L;
  sections: { curiosity: Item[]; misconceptions: Item[]; attractions: Item[]; objections: Item[]; one_concept: Concept; next_step: Item[] };
};
// Panel order. The same six one-word titles apply to every template; only body copy differs.
export const SECTION_KEYS = ["curiosity", "misconceptions", "attractions", "objections", "one_concept", "next_step"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export type Reference = {
  claim_id: string; title: string; statement_ar: string; statement_en: string;
  year: number | null; published: string | null; publisher: string; url: string;
};
export type Center = { id: string; iso3: string; name_ar: string; name_en: string; city_ar: string; city_en: string; official_url: string; verified_on: string };

export const countryMeta = countriesJson.meta;
export const countries = countriesJson.countries as Country[];
export const templateMeta = templatesJson.meta;
export const templates = templatesJson.templates as unknown as Record<string, Template>;
export const references = referencesJson.references as Reference[];
export const centersData = centersJson as { policy: L; centers: Center[] };
export const world = worldJson;

export const MISSING: L = countryMeta.missing_label;
export const findCountry = (iso3: string) => countries.find((c) => c.iso3 === iso3.toUpperCase());
export const refById = (id: string) => references.find((r) => r.claim_id === id);
export const groupLabel = (k: GroupKey): L => (countryMeta.group_labels as Record<string, L>)[k];
export const pick = (l: L | null | undefined, lang: Lang) => (l ? l[lang] : MISSING[lang]);
export const sectionTitle = (k: SectionKey): L => {
  const s = (templateMeta.section_titles as Record<SectionKey, { title_ar: string; title_en: string }>)[k];
  return { ar: s.title_ar, en: s.title_en };
};
