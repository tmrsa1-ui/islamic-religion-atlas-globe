import type { Metadata, Viewport } from "next";
import "./globals.css";
import LangToggle from "@/components/LangToggle";
import { getLang, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "أطلس الدين الإسلامي | Islamic Religion Atlas",
  description: "Background-aware, source-first introductions to Islam built only from Pew Research Center 2020 figures. Bathel 2026 track 03.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#131A1F" };

// Atlas mark: a globe (circle + meridian) with one lit copper point.
function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="flex-none">
      <circle cx="16" cy="16" r="12.5" fill="none" style={{ stroke: "var(--muted-night)" }} strokeOpacity=".6" strokeWidth="1" />
      <ellipse cx="16" cy="16" rx="5" ry="12.5" fill="none" style={{ stroke: "var(--muted-night)" }} strokeOpacity=".6" strokeWidth="1" />
      <path d="M3.5 16h25" fill="none" style={{ stroke: "var(--muted-night)" }} strokeOpacity=".35" strokeWidth="1" />
      <circle cx="21.5" cy="11" r="2.6" style={{ fill: "var(--copper-glow)" }} />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const nav = [
    ["/", t("nav_atlas", lang)], ["/references", t("nav_refs", lang)], ["/centers", t("nav_centers", lang)],
    ["/method", t("nav_method", lang)], ["/about", t("nav_about", lang)],
  ] as const;
  const links = nav.map(([href, label]) => (
    <a key={href} href={href} className="flex-none text-muted no-underline transition-colors hover:text-fg">{label}</a>
  ));
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="night min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-rule bg-bg">
          <div className="flex h-[var(--bar-h)] items-center gap-3 px-4">
            <a href="/" className="flex min-h-[44px] flex-none items-center gap-2.5 text-fg no-underline hover:text-fg">
              <Mark />
              <span className="text-[17px] font-semibold sm:text-[19px]">{t("site", lang)}</span>
            </a>
            <span className="hidden border-s border-rule ps-3 text-[13px] leading-6 text-muted xl:inline">{t("bar_tagline", lang)}</span>
            <nav className="ms-auto hidden items-center gap-6 text-[14px] md:flex" aria-label="main">{links}</nav>
            <div className="ms-auto md:ms-2"><LangToggle lang={lang} label={t("lang_group", lang)} /></div>
          </div>
          <nav className="flex gap-5 overflow-x-auto px-4 pb-2.5 text-[14px] md:hidden" aria-label="main">{links}</nav>
        </header>
        {children}
      </body>
    </html>
  );
}
