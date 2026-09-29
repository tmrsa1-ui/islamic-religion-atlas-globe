import { MISSING, references } from "@/lib/data";
import { getLang, t } from "@/lib/i18n";

export default async function ReferencesPage() {
  const lang = await getLang();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_refs", lang)}</h1>
      <ol className="space-y-3">
        {references.map((r) => (
          <li key={r.claim_id} id={r.claim_id} className="card scroll-mt-4 target:border-accent target:bg-surface">
            <p className="text-xs text-muted"><code className="ltr-num">{r.claim_id}</code></p>
            <p className="font-semibold" dir="ltr" lang="en">{r.title}</p>
            <p className="mt-1" lang={lang}>{lang === "ar" ? r.statement_ar : r.statement_en}</p>
            <p className="mt-2 text-sm text-muted">
              {t("publisher", lang)}: {r.publisher} · {t("year", lang)}: <span className="ltr-num">{r.year ?? MISSING[lang]}</span>
              {r.published && <> · {t("published", lang)}: <span className="ltr-num">{r.published}</span></>}
            </p>
            <p className="mt-1 break-all text-sm"><a href={r.url} rel="noopener" target="_blank" dir="ltr">{r.url}</a></p>
          </li>
        ))}
      </ol>
    </div>
  );
}
