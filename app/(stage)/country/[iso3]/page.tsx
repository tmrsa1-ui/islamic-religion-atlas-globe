import { notFound } from "next/navigation";
import AskBox from "@/components/AskBox";
import Bars from "@/components/Bars";
import SectionTabs from "@/components/SectionTabs";
import SourceFooter from "@/components/SourceFooter";
import { countries, refById, templates, type Lang } from "@/lib/data";
import { getLang, t } from "@/lib/i18n";
import { BACKGROUNDS, buildJourney, isBackground, type Journey, type Tab } from "@/lib/journey";

export function generateStaticParams() {
  return countries.map((c) => ({ iso3: c.iso3 }));
}

function Cites({ ids, lang }: { ids: string[]; lang: Lang }) {
  if (!ids.length) return null;
  return (
    <span className="ms-1 whitespace-nowrap text-xs">
      {ids.map((id) => (
        <a key={id} href={`/references#${id}`} className="ms-1 no-underline hover:underline" title={refById(id)?.title ?? id}>
          [{lang === "ar" ? "مصدر" : "src"}]
        </a>
      ))}
    </span>
  );
}

// Body of one tab. The heading is always the tab's one-word title; only the body varies by template.
function TabBody({ tab, i, j, lang }: { tab: Tab; i: number; j: Journey; lang: Lang }) {
  const empty = <p className="text-sm text-muted">{t("section_empty", lang)}</p>;
  let body;
  if ("items" in tab) {
    body = tab.items.length ? (
      <ol className="space-y-4">
        {tab.items.map((h) => (
          <li key={h.id} className="border-s-2 border-rule ps-4 text-[17px] leading-[1.85]">
            {h.href ? <a href={h.href}>{h[lang]}</a> : h[lang]}<Cites ids={h.claim_ids} lang={lang} />
          </li>
        ))}
      </ol>
    ) : empty;
  } else if ("concept" in tab) {
    const c = tab.concept;
    body = c ? (
      <div data-testid="detail">
        <p className="text-[19px] font-semibold text-accent2">{c.title[lang]}</p>
        <p className="mt-3 text-[17px] leading-[1.9]">{c[lang]}</p>
        <p className="mt-3 text-xs text-muted">
          <span className="ltr-num num">{c.word_count[lang]}</span> {t("words", lang)}
          <Cites ids={c.claim_ids} lang={lang} />
        </p>
      </div>
    ) : empty;
  } else {
    body = (<>
      <ul className="space-y-3" data-testid="citations">
        {tab.claim_ids.map((id) => {
          const r = refById(id);
          return (
            <li key={id} className="flex flex-col border-s border-rule ps-3">
              <a href={`/references#${id}`} className="text-[15px] font-medium"><bdi>{r?.title ?? id}</bdi></a>
              {r && <span className="text-xs text-muted num"><bdi>{r.publisher}</bdi>{r.year && <>{lang === "ar" ? "، " : ", "}<span className="ltr-num">{r.year}</span></>}</span>}
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-dashed border-rule pt-4 text-sm" data-testid="centers">
        <p className="kicker mb-1 font-semibold">{t("nav_centers", lang)}</p>
        {tab.centers.length ? (
          <ul className="space-y-1">
            {tab.centers.map((c) => (
              <li key={c.id}><a href={c.official_url} rel="noopener" target="_blank">{lang === "ar" ? c.name_ar : c.name_en}</a> · {lang === "ar" ? c.city_ar : c.city_en}</li>
            ))}
          </ul>
        ) : (
          <p>{t("no_centers", lang)} <a href={`/references#${j.source.claim_id}`}>{t("source_link", lang)}</a></p>
        )}
      </div>
    </>);
  }
  return (<>
    <header className="mb-5">
      <span className="text-xs font-semibold text-accent num"><bdi dir="ltr">{String(i + 1).padStart(2, "0")} / {String(j.tabs.length).padStart(2, "0")}</bdi></span>
      <h2 className="mt-1 text-2xl font-bold leading-tight">{tab.title[lang]}</h2>
    </header>
    {body}
  </>);
}

export default async function CountryPage({ params, searchParams }: { params: Promise<{ iso3: string }>; searchParams: Promise<{ bg?: string }> }) {
  const lang = await getLang();
  const { iso3 } = await params;
  const { bg: rawBg } = await searchParams;
  const bg = isBackground(rawBg) ? rawBg : undefined;
  const res = buildJourney({ iso3, background: bg });
  if (!res.ok) notFound();
  const j = res.data;
  const explicitBg = j.background_source === "explicit" ? bg ?? null : null;
  const q = explicitBg ? `?bg=${explicitBg}` : "";
  const other: Lang = lang === "ar" ? "en" : "ar";
  const at = countries.findIndex((c) => c.iso3 === j.iso3);
  const prevC = countries[(at - 1 + countries.length) % countries.length], nextC = countries[(at + 1) % countries.length];

  return (
    <article className="paper relative min-h-full shadow-[0_0_24px_-12px_var(--ink)] max-lg:-mt-3 max-lg:rounded-t-[10px]" aria-labelledby="country-h">
      <header className="z-10 border-b border-rule bg-bg px-6 pb-4 pt-2 max-lg:rounded-t-[10px] lg:sticky lg:top-0">
        <div className="flex items-center justify-between gap-3">
          <span className="kicker">{t("file", lang)} · <bdi dir="ltr" className="tracking-wider">{j.iso3}</bdi> · Pew <span className="num">2020</span></span>
          <a href={`/${q}`} aria-label={t("close", lang)} title={t("close", lang)} className="-me-3 grid h-11 w-11 place-items-center text-fg no-underline hover:text-accent">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" /></svg>
          </a>
        </div>
        <h1 id="country-h" className="rise text-[30px] font-bold leading-[1.15] lg:text-[36px]">{j.country_name[lang]}</h1>
        <p className="mt-1 text-sm text-muted"><bdi>{j.country_name[other]}</bdi></p>
      </header>

      <div className="space-y-8 px-6 pb-8 pt-6">
        {/* 1. Pew 2020 bars */}
        <section aria-labelledby="fig-h">
          <h2 id="fig-h" className="h2 text-base">{t("figures", lang)}</h2>
          <Bars bars={j.figures} lang={lang} claimId={j.source.claim_id} missingWhy={t("why_missing", lang)} />
          <p className="mt-3 text-xs text-muted">
            <a href={`/references#${j.source.claim_id}`}>{j.source.publisher[lang]}, <span className="ltr-num">{j.source.year}</span></a>
          </p>
        </section>

        {/* 2. template badge: describes the framing, never the visitor */}
        <section aria-label={t("framing", lang)}>
          <p className="inline-block rounded-[2px] border border-accent2 px-3 py-1.5 text-sm font-semibold text-accent2" data-testid="badge">
            {j.badge[lang]}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{j.inference_policy[lang]}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BACKGROUNDS.map((b) => {
              const on = b === "unspecified" ? j.background_source === "country" : explicitBg === b;
              const label = b === "unspecified" ? t("bg_unspecified", lang) : templates[b].label[lang];
              return (
                <a key={b} href={b === "unspecified" ? `/country/${j.iso3}` : `/country/${j.iso3}?bg=${b}`}
                  className={`chip min-h-[32px] px-2.5 text-xs ${on ? "chip-on" : ""}`} aria-current={on ? "true" : undefined}>{label}</a>
              );
            })}
          </div>
        </section>

        {/* 3. six tabs: المدخل، التصوّر، الوقفة، التحفّظ، الأصل، المرجع */}
        <section data-template={j.template_id ?? ""}>
          <SectionTabs label={t("tabs_label", lang)} prev={t("prev", lang)} next={t("next", lang)}
            tabs={j.tabs.map((tab) => ({ key: tab.key, title: tab.title[lang] }))}
            panels={j.tabs.map((tab, i) => <TabBody key={tab.key} tab={tab} i={i} j={j} lang={lang} />)} />
        </section>

        <AskBox iso3={j.iso3} bg={explicitBg} lang={lang}
          labels={{ title: t("ask", lang), ph: t("ask_ph", lang), btn: t("ask_btn", lang), abstain: t("abstain", lang) }} />

        <nav className="grid grid-cols-2 gap-3 border-t border-rule pt-4 text-sm" aria-label={t("countries", lang)}>
          <a href={`/country/${prevC.iso3}${q}`} className="flex flex-col no-underline">
            <span className="text-xs text-muted">{t("prev_country", lang)}</span><span className="font-medium">{prevC.name[lang]}</span>
          </a>
          <a href={`/country/${nextC.iso3}${q}`} className="flex flex-col text-end no-underline">
            <span className="text-xs text-muted">{t("next_country", lang)}</span><span className="font-medium">{nextC.name[lang]}</span>
          </a>
        </nav>
        <SourceFooter lang={lang} />
      </div>
    </article>
  );
}
