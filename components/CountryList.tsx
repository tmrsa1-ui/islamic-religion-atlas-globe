"use client";
import { useMemo, useState } from "react";
import type { L, Lang } from "@/lib/data";

type Row = { iso3: string; name: L; template: L };
// Hovering or focusing a row turns the globe toward that country (see Stage).
const peek = (iso3: string | null) => window.dispatchEvent(new CustomEvent("atlas:peek", { detail: iso3 }));

export default function CountryList({ rows, lang, bg, placeholder, empty }: { rows: Row[]; lang: Lang; bg: string | null; placeholder: string; empty: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.iso3, r.name.ar, r.name.en].some((v) => v.toLowerCase().includes(s)));
  }, [q, rows]);
  const other: Lang = lang === "ar" ? "en" : "ar";
  return (
    <div>
      <label className="sr-only" htmlFor="country-search">{placeholder}</label>
      <input id="country-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
        className="field mb-2" autoComplete="off" />
      <ul className="divide-y divide-rule/70" data-testid="country-list" onMouseLeave={() => peek(null)}>
        {shown.map((r) => (
          <li key={r.iso3}>
            <a href={`/country/${r.iso3}${bg ? `?bg=${bg}` : ""}`} onMouseEnter={() => peek(r.iso3)} onFocus={() => peek(r.iso3)} onBlur={() => peek(null)}
              className="group flex min-h-[52px] items-center gap-3 border-s-2 border-transparent px-3 text-fg no-underline transition-colors hover:border-accent hover:bg-surface/60 hover:text-fg focus-visible:border-accent">
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-medium">{r.name[lang]}</span>
                <bdi className="text-xs text-muted">{r.name[other]}</bdi>
              </span>
              <span className="hidden text-xs text-muted sm:inline">{r.template[lang]}</span>
              <bdi dir="ltr" className="num text-xs tracking-wider text-muted group-hover:text-accent">{r.iso3}</bdi>
            </a>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-2 text-sm text-muted">{empty}</p>}
    </div>
  );
}
