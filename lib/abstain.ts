// Detects questions the atlas must not answer. Token-based so Arabic "حد" never matches inside "واحد".
export type AbstainTopic = "apostasy" | "hudud" | "gender_rulings" | "contemporary_politics";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKC")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
    .replace(/'s\b/g, "");

const TOPICS: Record<AbstainTopic, { words: string[]; phrases: string[] }> = {
  apostasy: {
    words: ["apostasy", "apostate", "apostates", "murtad", "riddah", "ridda", "ردة", "مرتد", "مرتدين", "ارتداد"],
    phrases: ["leave islam", "leaving islam", "leaves islam", "left islam", "ترك الاسلام", "الخروج من الاسلام"],
  },
  hudud: {
    words: ["hadd", "hudud", "hudood", "stoning", "stoned", "amputation", "amputate", "flogging", "lashes", "lashing", "qisas", "حد", "حدود", "رجم", "جلد", "قصاص"],
    phrases: ["cut off", "cutting off", "punishment for theft", "punishment for adultery", "punishment for blasphemy", "قطع اليد", "عقوبة السرقة", "عقوبة الزنا"],
  },
  gender_rulings: {
    words: ["polygamy", "polygyny", "hijab", "niqab", "burqa", "divorce", "inheritance", "guardianship", "wali", "تعدد", "حجاب", "نقاب", "طلاق", "ميراث", "قوامه", "ولايه"],
    phrases: ["women testimony", "woman testimony", "womens testimony", "beat his wife", "beat their wives", "ruling on women", "can women", "can a woman", "شهاده المراه", "ضرب الزوجه"],
  },
  contemporary_politics: {
    words: ["israel", "palestine", "palestinian", "gaza", "caliphate", "isis", "daesh", "taliban", "hamas", "hezbollah", "election", "elections", "jihad", "jihadist", "اسرائيل", "فلسطين", "غزه", "خلافه", "داعش", "طالبان", "حماس", "انتخابات", "جهاد", "الاخوان"],
    phrases: ["muslim brotherhood", "sharia law", "islamic state", "political islam", "الاسلام السياسي", "الدوله الاسلاميه"],
  },
};

// Pre-normalize keyword lists once (ة→ه only for keyword matching).
const fold = (s: string) => norm(s).replace(/ة/g, "ه");
const SETS = Object.fromEntries(
  Object.entries(TOPICS).map(([k, v]) => [k, { words: new Set(v.words.map(fold)), phrases: v.phrases.map(fold) }]),
) as Record<AbstainTopic, { words: Set<string>; phrases: string[] }>;

function variants(tok: string): string[] {
  const out = new Set([tok]);
  let t = tok;
  if (/^[وفبلك]/.test(t) && t.length > 3) { t = t.slice(1); out.add(t); }
  if (t.startsWith("ال") && t.length > 3) out.add(t.slice(2));
  if (/^(بال|وال|فال|لل|كال)/.test(tok) && tok.length > 4) out.add(tok.replace(/^(بال|وال|فال|كال|لل)/, ""));
  return [...out];
}

export function detectAbstain(question: string | undefined | null): AbstainTopic | null {
  if (!question || !question.trim()) return null;
  const text = fold(question).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const tokens = text.split(" ");
  for (const topic of Object.keys(SETS) as AbstainTopic[]) {
    const { words, phrases } = SETS[topic];
    if (phrases.some((p) => ` ${text} `.includes(` ${p} `))) return topic;
    if (tokens.some((tk) => variants(tk).some((v) => words.has(v)))) return topic;
  }
  return null;
}
