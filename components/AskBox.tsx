"use client";
import { useState } from "react";
import type { L, Lang } from "@/lib/data";

type Resp = { abstain_flag: boolean; referral: L | null; question_note: L | null; abstain_topic: string | null };

export default function AskBox({ iso3, bg, lang, labels }: { iso3: string; bg: string | null; lang: Lang; labels: { title: string; ph: string; btn: string; abstain: string } }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/journey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ iso3, background: bg ?? undefined, question: q }),
      });
      setRes(await r.json());
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="ask-h" className="border-t border-rule pt-6">
      <h2 id="ask-h" className="h2">{labels.title}</h2>
      <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.ph} maxLength={500} className="field flex-1" aria-label={labels.title} />
        <button type="submit" disabled={busy} className="btn">{labels.btn}</button>
      </form>
      {res && (res.abstain_flag ? (
        <p role="status" className="rise mt-4 border-s-2 border-dashed border-clay ps-4 text-[15px] leading-relaxed">
          <strong className="mb-1 block text-sm text-clay">{labels.abstain}</strong>{res.referral?.[lang]}
        </p>
      ) : res.question_note ? (
        <p role="status" className="rise mt-4 text-sm text-muted">{res.question_note[lang]}</p>
      ) : null)}
    </section>
  );
}
