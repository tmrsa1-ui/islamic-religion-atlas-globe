import { getLang } from "@/lib/i18n";

const C = {
  title: { ar: "عن المشروع", en: "About" },
  blocks: [
    {
      h: { ar: "المشكلة", en: "Problem" },
      p: { ar: "مقدمة واحدة عن الإسلام لا تنفع المسيحي والهندوسي والسويدي العلماني والبوذي التايلاندي معًا.", en: "One introduction to Islam fails a Christian, a Hindu, a secular Swede and a Thai Buddhist alike." },
    },
    {
      h: { ar: "معيار النجاح", en: "Success" },
      p: { ar: "من اختيار بلد أو خلفية صريحة: عناوين خلال 60 ثانية، ثم مفهوم إسلامي واحد عند التوسّع، ثم مصدر أو مركز موثق.", en: "From choosing a country or an explicit background: headlines within 60 seconds, one Islamic concept on expand, then a source or a verified center." },
    },
    {
      h: { ar: "المحرك", en: "Engine" },
      p: { ar: "المنتج هو محرك الرحلة (POST /api/journey): يختار القالب والعناوين والمفهوم والمصادر من ملفات /data فقط، ويمتنع عن الأحكام في الردة والحدود وأحكام الجنسين والسياسة. هو استرجاع حتمي بلا نموذج لغوي ولا أسرار. الكرة الأرضية ليست المنتج.", en: "The product is the journey engine (POST /api/journey): it selects template, headlines, concept and sources from /data only, and abstains on apostasy, hudud, gender rulings and politics. It is deterministic retrieval with no language-model call and no secrets. The globe is not the product." },
    },
    {
      h: { ar: "النطاق", en: "Scope" },
      p: { ar: "لا 201 دولة، لا طقس حي، لا محرك فتاوى، لا خلط بين بيو وقاعدة البيانات المسيحية العالمية، لا استنتاج آلي لدين الزائر.", en: "No 201 countries, no live weather, no fatwa engine, no mixing Pew and World Christian Database on one card, no auto-detection of religion." },
    },
    {
      h: { ar: "إفصاح", en: "Disclosure" },
      p: { ar: "بُني لمسار 03 في بذل 2026؛ العمل المحكَّم من 4 إلى 6 أكتوبر 2026. الكرة الأرضية مقتبسة ومعدّلة من مشروع سابق للفريق هو «فلك»: شيفرة الكرة، واللوحة الليلية، وخط IBM Plex Sans Arabic، وأسماء الدول. لم يُستخدم شيء من «أديم» أو «أفق». التفاصيل في README.", en: "Built for Bathel 2026 track 03; judged work is 4–6 Oct 2026. The globe is adapted from the team's earlier project Falak: its globe code, night palette, IBM Plex Sans Arabic files and country names. Nothing from Adim or Ufuq is used. Details in the README." },
    },
  ],
};

export default async function AboutPage() {
  const lang = await getLang();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{C.title[lang]}</h1>
      {C.blocks.map((b) => (
        <section key={b.h.en} className="card">
          <h2 className="h2">{b.h[lang]}</h2>
          <p>{b.p[lang]}</p>
        </section>
      ))}
    </div>
  );
}
