"use client";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// The six fixed tabs as a notebook: a 3×2 numbered index, one section at a time, then previous/next.
// Panels are rendered on the server; this only switches them. Numbers come from a CSS counter so each
// tab's text stays its one-word title. Arrow keys follow reading direction (ArrowLeft moves forward in Arabic).
export default function SectionTabs({ tabs, panels, label, prev, next }: {
  tabs: { key: string; title: string }[]; panels: ReactNode[]; label: string; prev: string; next: string;
}) {
  const [active, setActive] = useState(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (i: number, focus = true) => {
    const n = (i + tabs.length) % tabs.length;
    setActive(n);
    if (focus) btns.current[n]?.focus();
    else btns.current[n]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const onKey = (e: KeyboardEvent) => {
    const rtl = document.documentElement.dir === "rtl";
    if (e.key === "ArrowRight") go(active + (rtl ? -1 : 1));
    else if (e.key === "ArrowLeft") go(active + (rtl ? 1 : -1));
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(tabs.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div data-testid="tabs">
      <div role="tablist" aria-label={label} onKeyDown={onKey} className="nb-index grid grid-cols-3 border-y border-rule">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => { btns.current[i] = el; }}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-controls={`panel-${t.key}`}
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`nb-tab -mb-px min-h-[56px] border-b-2 px-1 py-1.5 text-center text-[13px] transition-colors ${i === active ? "border-accent font-semibold text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >{t.title}</button>
        ))}
      </div>
      {panels.map((p, i) => (
        <div key={tabs[i].key} role="tabpanel" id={`panel-${tabs[i].key}`} aria-labelledby={`tab-${tabs[i].key}`}
          hidden={i !== active} tabIndex={0} className="nb-panel pt-6 focus-visible:outline-offset-4">
          {p}
        </div>
      ))}
      <div className="mt-6 flex items-center gap-3 border-t border-rule pt-2 text-[13px]">
        {active > 0 && (
          <button type="button" onClick={() => go(active - 1, false)} className="min-h-[44px] text-start text-muted transition-colors hover:text-fg">
            {prev} · {tabs[active - 1].title}
          </button>
        )}
        <span className="flex-1" />
        {active < tabs.length - 1 && (
          <button type="button" onClick={() => go(active + 1, false)} className="min-h-[44px] text-end font-medium text-accent transition-colors hover:text-fg">
            {next} · {tabs[active + 1].title}
          </button>
        )}
      </div>
    </div>
  );
}
