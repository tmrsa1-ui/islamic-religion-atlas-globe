import Bars from "@/components/Bars";
import CountryList from "@/components/CountryList";
import RandomCountry from "@/components/RandomCountry";
import SourceFooter from "@/components/SourceFooter";
import { countries, templates, world, MISSING } from "@/lib/data";
import { getLang, t } from "@/lib/i18n";
import { BACKGROUNDS, isBackground } from "@/lib/journey";

export default async function Home({ searchParams }: { searchParams: Promise<{ bg?: string }> }) {
  const lang = await getLang();
  const { bg: rawBg } = await searchParams;
  const bg = isBackground(rawBg) && rawBg !== "unspecified" ? rawBg : null;
  const rows = countries.map((c) => ({ iso3: c.iso3, name: c.name, template: templates[c.content_template_id]?.label ?? MISSING }));
  const bars = world.groups.map((g) => ({ key: g.key, label: g.label, pct: g.pct, display: { ar: `${g.pct}%`, en: `${g.pct}%` } }));

  return (
    <div className="night min-h-full px-5 pb-8 pt-7 lg:border-e lg:border-rule lg:px-7">
      <p className="kicker rise">{t("kicker", lang)}</p>
      <h1 className="rise mt-2 text-[30px] font-bold leading-tight lg:text-[34px]">{t("site", lang)}</h1>
      <p className="rise mt-3 text-[15px] leading-relaxed text-fg/85">{t("tagline", lang)}</p>
      <div className="rise mt-5">
        <RandomCountry iso3s={countries.map((c) => c.iso3)} bg={bg} label={t("random", lang)} />
      </div>

      <section className="mt-9" aria-labelledby="bg-h">
        <h2 id="bg-h" className="h2 text-base">{t("bg_title", lang)}</h2>
        <div className="mb-2 flex flex-wrap gap-2">
          {BACKGROUNDS.map((b) => {
            const on = (b === "unspecified" && !bg) || b === bg;
            const label = b === "unspecified" ? t("bg_unspecified", lang) : templates[b].label[lang];
            return (
              <a key={b} href={b === "unspecified" ? "/" : `/?bg=${b}`} className={`chip ${on ? "chip-on" : ""}`} aria-current={on ? "true" : undefined}>
                {label}
              </a>
            );
          })}
        </div>
        <p className="text-[13px] leading-relaxed text-muted">{t("bg_hint", lang)}</p>
      </section>

      <section className="mt-9" aria-labelledby="c-h">
        <h2 id="c-h" className="h2 text-base">{t("countries", lang)}</h2>
        <CountryList rows={rows} lang={lang} bg={bg} placeholder={t("search", lang)} empty={t("no_match", lang)} />
      </section>

      <section className="mt-9" aria-labelledby="w-h">
        <h2 id="w-h" className="h2 text-base">{t("world", lang)}</h2>
        <Bars bars={bars} lang={lang} claimId="pew-world-2020" missingWhy={t("why_missing", lang)} />
        <p className="mt-4 text-[13px] leading-relaxed text-muted">{world.growth_note[lang]}</p>
      </section>

      <SourceFooter lang={lang} />
    </div>
  );
}
