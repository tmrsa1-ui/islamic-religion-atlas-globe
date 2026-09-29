import { readFileSync } from "node:fs";
import path from "node:path";
import Bars from "@/components/Bars";
import { world } from "@/lib/data";
import { getLang, t } from "@/lib/i18n";
import { methodSection, renderMd } from "@/lib/md";

export default async function MethodPage() {
  const lang = await getLang();
  let html = "";
  try {
    html = renderMd(methodSection(readFileSync(path.join(process.cwd(), "data", "method.md"), "utf8"), lang));
  } catch {
    html = `<p>${lang === "ar" ? "تعذّر تحميل ملف المنهج." : "Method file could not be loaded."}</p>`;
  }
  const eu = world.europe_2020.groups.map((g) => ({ key: g.key, label: g.label, pct: g.pct, display: { ar: `${g.pct}%`, en: `${g.pct}%` } }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_method", lang)}</h1>
      <div className="card" dangerouslySetInnerHTML={{ __html: html }} />
      <section className="card">
        <h2 className="h2">{lang === "ar" ? "أوروبا 2020 (بيو)" : "Europe 2020 (Pew)"}</h2>
        <Bars bars={eu} lang={lang} claimId={world.europe_2020.claim_id} missingWhy={t("why_missing", lang)} />
      </section>
    </div>
  );
}
