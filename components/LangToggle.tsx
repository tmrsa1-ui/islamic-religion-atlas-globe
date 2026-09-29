"use client";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/data";

// Segmented عربي | EN. The choice lives in the `lang` cookie; the server re-renders with the new direction.
export default function LangToggle({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter();
  const set = (next: Lang) => {
    if (next === lang) return;
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  const cls = (on: boolean) => `min-h-[40px] min-w-[44px] px-2 transition-colors ${on ? "bg-surface text-accent2" : "text-muted hover:text-fg"}`;
  return (
    <div role="group" aria-label={label} className="flex flex-none rounded-[2px] border border-rule">
      <button type="button" lang="ar" aria-pressed={lang === "ar"} onClick={() => set("ar")} className={`${cls(lang === "ar")} text-[13px]`}>عربي</button>
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => set("en")} className={`${cls(lang === "en")} border-s border-rule text-[12px] tracking-wide`}>EN</button>
    </div>
  );
}
