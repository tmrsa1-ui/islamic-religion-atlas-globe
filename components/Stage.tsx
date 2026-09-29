"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import EarthPlate from "./EarthPlate";
import type { GlobeApi, GlobeCountry } from "@/lib/globe";

type Text = { hint: string; sun: string; borders: string; outside: string };
const PANEL = 460; // px, desktop panel width (inline-start side)

// The globe lives in the (stage) layout, so it persists while the URL moves between / and /country/XYZ.
// Server-rendered panels stay the source of truth; without JS or 3D support the static plate remains.
export default function Stage({ lang, atlas, text, children }: { lang: "ar" | "en"; atlas: string[]; text: Text; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<GlobeApi | null>(null);
  const names = useRef<Record<string, GlobeCountry>>({});
  const router = useRouter();
  const pathname = usePathname();
  const sel = /^\/country\/([A-Za-z]{3})/.exec(pathname)?.[1]?.toUpperCase() ?? null;
  const selRef = useRef(sel);
  selRef.current = sel;
  const langRef = useRef(lang);
  langRef.current = lang;
  const [state, setState] = useState<"idle" | "on" | "off">("idle");
  const [wide, setWide] = useState(false);
  const [sun, setSun] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const f = () => setWide(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      const { createGlobe, hasWebGL } = await import("@/lib/globe");
      if (!host.current || !hasWebGL()) { setState("off"); return; }
      const index: { countries: GlobeCountry[] } = await fetch("/globe/countries.index.json").then((r) => r.json());
      if (dead || !host.current) return;
      index.countries.forEach((c) => { names.current[c.iso3] = c; });
      let intro = true;
      try { intro = !sessionStorage.getItem("atlas-intro"); sessionStorage.setItem("atlas-intro", "1"); } catch { /* private mode */ }
      const small = !matchMedia("(min-width: 1024px)").matches;
      const g = await createGlobe(host.current, index.countries, {
        onSelect: (k) => {
          if (k && atlas.includes(k)) { if (k !== selRef.current) router.push(`/country/${k}${location.search}`); return; }
          if (k) { const c = names.current[k]; setToast(c ? (langRef.current === "ar" ? c.nameAr : c.nameEn) : k); return; }
          if (k === "" && selRef.current) router.push(`/${location.search}`);
        },
        onSun: ({ lat, lon, utc }) => setSun(`${lat.toFixed(1)}°, ${lon.toFixed(1)}° · ${utc.toISOString().slice(11, 16)} UTC`),
      }, {
        lang, atlas: new Set(atlas), texture: small ? 2048 : 4096, touchPan: small, intro,
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
      if (dead) { g.dispose(); return; }
      api.current = g; setState("on");
    })().catch(() => { if (!dead) setState("off"); });
    const onPeek = (e: Event) => api.current?.peek((e as CustomEvent<string | null>).detail);
    window.addEventListener("atlas:peek", onPeek);
    return () => { dead = true; window.removeEventListener("atlas:peek", onPeek); api.current?.dispose(); api.current = null; };
    // Mount once: selection, language and layout are pushed in by the effects below.
  }, []);

  useEffect(() => {
    const g = api.current; if (!g) return;
    g.setSelected(sel);
    if (sel) g.focus(sel); else g.reset();
  }, [sel, state]);
  useEffect(() => { api.current?.setLang(lang); }, [lang, state]);
  useEffect(() => {
    const rtl = document.documentElement.dir === "rtl";
    api.current?.setOffset(wide ? (rtl ? PANEL / 2 : -PANEL / 2) : 0, 0);
  }, [wide, lang, state]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="relative lg:h-[calc(100dvh-var(--bar-h))] lg:overflow-hidden">
      <div className={`stage-glow relative overflow-hidden lg:absolute lg:inset-0 lg:h-auto ${sel ? "h-[38vh] min-h-[240px]" : "h-[52vh] min-h-[320px]"}`}>
        <div ref={host} className="absolute inset-0" />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-700 lg:ps-[460px] ${state === "on" ? "opacity-0" : "opacity-100"}`}>
          <EarthPlate />
        </div>
        <div className="pointer-events-none absolute inset-x-4 bottom-3 flex flex-col gap-2 lg:start-[476px]">
          {toast ? (
            <p role="status" className="toast self-center rounded-[2px] border border-rule bg-bg px-3 py-1.5 text-[13px] text-fg">
              <bdi>{toast}</bdi> {text.outside}
            </p>
          ) : !sel && state === "on" ? (
            <p className="self-center text-center text-xs text-muted">{text.hint}</p>
          ) : null}
          {sun && (
            <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted num">
              <span>{text.sun} <bdi dir="ltr">{sun}</bdi></span>
              <span className="hidden sm:inline">{text.borders} · <bdi dir="ltr">Natural Earth 1:110m · Yale BSC</bdi></span>
            </p>
          )}
        </div>
      </div>
      <div className="relative z-10 lg:absolute lg:inset-y-0 lg:start-0 lg:w-[460px] lg:overflow-y-auto">{children}</div>
    </div>
  );
}
