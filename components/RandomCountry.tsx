"use client";
import { useRouter } from "next/navigation";

// Picks one of the twelve at random; the globe flies there because the URL changes.
export default function RandomCountry({ iso3s, bg, label }: { iso3s: string[]; bg: string | null; label: string }) {
  const router = useRouter();
  const go = () => {
    const here = /^\/country\/([A-Z]{3})/.exec(location.pathname)?.[1];
    const pool = iso3s.filter((c) => c !== here);
    router.push(`/country/${pool[Math.floor(Math.random() * pool.length)]}${bg ? `?bg=${bg}` : ""}`);
  };
  return (
    <button type="button" onClick={go} className="btn">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <ellipse cx="8" cy="8" rx="2.6" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="11.2" cy="5.4" r="1.6" fill="currentColor" />
      </svg>
      {label}
    </button>
  );
}
