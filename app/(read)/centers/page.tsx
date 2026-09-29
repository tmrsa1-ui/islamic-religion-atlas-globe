import { centersData, countries } from "@/lib/data";
import { getLang, t } from "@/lib/i18n";

export default async function CentersPage() {
  const lang = await getLang();
  const { centers, policy } = centersData;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("centers", lang)}</h1>
      <p className="card">{policy[lang]}</p>
      {centers.length ? (
        <ul className="space-y-2">
          {centers.map((c) => (
            <li key={c.id} className="card">
              <a href={c.official_url} rel="noopener" target="_blank">{lang === "ar" ? c.name_ar : c.name_en}</a>
              <span className="text-sm text-muted"> · {lang === "ar" ? c.city_ar : c.city_en} · {countries.find((x) => x.iso3 === c.iso3)?.name[lang]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg/80">
          {lang === "ar" ? "لا توجد مراكز موثقة حاليًا. ابدأ من " : "No verified centers yet. Start from "}
          <a href="/references">{t("nav_refs", lang)}</a>.
        </p>
      )}
    </div>
  );
}
