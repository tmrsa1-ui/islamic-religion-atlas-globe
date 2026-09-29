import SourceFooter from "@/components/SourceFooter";
import { getLang } from "@/lib/i18n";

// Reading pages: one paper sheet on the night background.
export default async function ReadLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <main className="stage-glow px-3 py-6 sm:px-4 sm:py-12">
      <div className="paper rise mx-auto max-w-3xl rounded-[2px] px-5 py-7 shadow-[0_8px_24px_-8px_var(--ink)] sm:px-10 sm:py-10">
        {children}
        <SourceFooter lang={lang} />
      </div>
    </main>
  );
}
