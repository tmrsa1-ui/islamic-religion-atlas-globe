import { cookies } from "next/headers";
import type { L, Lang } from "./data";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" ? "en" : "ar";
}

export const UI = {
  site: { ar: "أطلس الدين الإسلامي", en: "Islamic Religion Atlas" },
  tagline: {
    ar: "مقدمة واحدة لا تناسب الجميع. اختر بلدًا أو خلفية صريحة، واقرأ عناوين موثقة بالمصادر في أقل من دقيقة.",
    en: "One introduction does not fit everyone. Choose a country or an explicit background and read sourced headlines in under a minute.",
  },
  nav_atlas: { ar: "الأطلس", en: "Atlas" },
  nav_refs: { ar: "المراجع", en: "References" },
  nav_centers: { ar: "المراكز", en: "Centers" },
  nav_method: { ar: "المنهج", en: "Method" },
  nav_about: { ar: "عن المشروع", en: "About" },
  lang_group: { ar: "اللغة", en: "Language" },
  bar_tagline: { ar: "كل رقم بمصدره", en: "Every figure with its source" },
  kicker: { ar: "بيو 2020 · اثنتا عشرة دولة", en: "Pew 2020 · twelve countries" },
  stage_hint: {
    ar: "اثنتا عشرة دولة مضاءة بالنحاس على الكرة. اسحب لتدوير الأرض، واضغط دولة لتفتح ملفها.",
    en: "Twelve countries are lit in copper. Drag to turn the Earth; tap a country to open its file.",
  },
  random: { ar: "خذني إلى دولة", en: "Take me to a country" },
  outside: { ar: "خارج الدول الاثنتي عشرة في هذا الأطلس", en: "is outside this atlas's twelve countries" },
  sun_now: { ar: "الشمس الآن عموديًا فوق", en: "Sun overhead now at" },
  borders_note: { ar: "الحدود تقريبية وليست موقفًا", en: "Borders are approximate, not a position" },
  file: { ar: "ملف", en: "File" },
  close: { ar: "إغلاق الملف", en: "Close the file" },
  prev: { ar: "السابق", en: "Previous" },
  next: { ar: "التالي", en: "Next" },
  prev_country: { ar: "الدولة السابقة", en: "Previous country" },
  next_country: { ar: "الدولة التالية", en: "Next country" },
  framing: { ar: "الإطار", en: "Framing" },
  search: { ar: "ابحث عن بلد…", en: "Search a country…" },
  no_match: { ar: "لا يوجد بلد مطابق.", en: "No matching country." },
  bg_title: { ar: "اختيار صريح للخلفية (اختياري)", en: "Explicit background (optional)" },
  bg_hint: {
    ar: "إن لم تختر، نستخدم قالب البلد. لا نستنتج دينك من لغتك أو سلوكك أو عنوانك الشبكي.",
    en: "If you do not choose, we use the country template. We never infer your religion from language, behavior or IP.",
  },
  bg_unspecified: { ar: "بلا تحديد", en: "Unspecified" },
  countries: { ar: "الدول (12)", en: "Countries (12)" },
  world: { ar: "العالم 2020 (بيو)", en: "World 2020 (Pew)" },
  figures: { ar: "التركيب الديني، بيو 2020", en: "Religious composition, Pew 2020" },
  tabs_label: { ar: "الأقسام", en: "Sections" },
  section_empty: { ar: "لا مادة هنا لهذا الإطار.", en: "Nothing here for this framing." },
  words: { ar: "كلمة", en: "words" },
  centers: { ar: "مراكز موثقة", en: "Verified centers" },
  no_centers: {
    ar: "لا يوجد مركز موثق لهذا البلد بعد. بدلًا من ذلك، ابدأ من المصدر:",
    en: "No verified center for this country yet. Start from the source instead:",
  },
  source_link: { ar: "جدول بيو القُطري 2020", en: "Pew country table 2020" },
  why_missing: { ar: "لماذا؟", en: "Why?" },
  ask: { ar: "سؤال", en: "Question" },
  ask_ph: { ar: "مثال: ما حد السرقة؟", en: "e.g. what is the hadd for theft" },
  ask_btn: { ar: "أرسل", en: "Send" },
  abstain: { ar: "امتناع عن الحكم", en: "Abstained: no ruling" },
  footer_refs: { ar: "المراجع", en: "References" },
  footer_src: {
    ar: "الأرقام: مركز بيو للأبحاث، بيانات 2020، نُشرت في 9 يونيو 2025.",
    en: "Figures: Pew Research Center, 2020 data, published 9 June 2025.",
  },
  back: { ar: "كل الدول", en: "All countries" },
  published: { ar: "نُشر", en: "Published" },
  year: { ar: "السنة", en: "Year" },
  publisher: { ar: "الناشر", en: "Publisher" },
} satisfies Record<string, L>;

export const t = (key: keyof typeof UI, lang: Lang) => UI[key][lang];
