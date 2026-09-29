import Stage from "@/components/Stage";
import { countries } from "@/lib/data";
import { getLang, t } from "@/lib/i18n";

// Home and country pages share one globe; it stays mounted while the panel beside it changes.
export default async function StageLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <Stage lang={lang} atlas={countries.map((c) => c.iso3)}
      text={{ hint: t("stage_hint", lang), sun: t("sun_now", lang), borders: t("borders_note", lang), outside: t("outside", lang) }}>
      {children}
    </Stage>
  );
}
