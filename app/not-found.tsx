import { getLang, t } from "@/lib/i18n";

export default async function NotFound() {
  const lang = await getLang();
  return (
    <main className="stage-glow grid min-h-[calc(100dvh-var(--bar-h))] place-items-center px-4">
      <div className="paper w-full max-w-sm rounded-[2px] p-8 text-center">
        <h1 className="h2 ltr-num num text-3xl">404</h1>
        <p>{lang === "ar" ? "غير موجود في هذا الأطلس." : "Not in this atlas."}</p>
        <a href="/" className="mt-4 inline-block">{t("back", lang)}</a>
      </div>
    </main>
  );
}
