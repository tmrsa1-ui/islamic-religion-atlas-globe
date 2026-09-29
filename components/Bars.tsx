import type { L, Lang } from "@/lib/data";

export type Bar = { key: string; label: L; pct: number | null; display: L };

// Every value links to its reference; missing values say so and link to /method. The largest share is verdigris.
export default function Bars({ bars, lang, claimId, missingWhy }: { bars: Bar[]; lang: Lang; claimId: string; missingWhy: string }) {
  const top = Math.max(...bars.map((b) => b.pct ?? -1));
  return (
    <ul className="space-y-2.5" data-testid="bars">
      {bars.map((b, i) => (
        <li key={b.key} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-sm sm:grid-cols-[8rem_1fr_3.75rem]">
          <span>{b.label[lang]}</span>
          {b.pct !== null ? (<>
            <span className="h-2 overflow-hidden rounded-[1px] bg-rule/70" aria-hidden="true">
              <span className={`bar-fill block h-full ${b.pct === top ? "bg-accent2" : "bg-accent"}`}
                style={{ width: `${Math.max(b.pct, 0.6)}%`, animationDelay: `${i * 70}ms` }} />
            </span>
            <a className="ltr-num num text-end font-semibold text-fg no-underline hover:text-accent hover:underline" href={`/references#${claimId}`} data-pct={b.pct}
              title={lang === "ar" ? "المصدر: بيو 2020" : "Source: Pew 2020"}>{b.display[lang]}</a>
          </>) : (
            <span className="col-span-2 text-xs text-muted" data-missing="true">
              <span className="underline decoration-clay decoration-dashed underline-offset-4">{b.display[lang]}</span> · <a href="/method">{missingWhy}</a>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
