import type { Lang } from "@/lib/data";
import { t } from "@/lib/i18n";

export default function SourceFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-10 border-t border-rule pt-4 text-xs text-muted">
      <a href="/references" className="font-semibold">{t("footer_refs", lang)}</a>
      <span className="mx-2">·</span>{t("footer_src", lang)}
    </footer>
  );
}
