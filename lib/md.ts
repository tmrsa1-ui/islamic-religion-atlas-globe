// Minimal markdown for data/method.md: headings, lists, paragraphs, links, bold, italics, code.
import type { Lang } from "./data";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) =>
  esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_m, t, u) => `<a href="${u}"${u.startsWith("http") ? ' rel="noopener" target="_blank"' : ""}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="ltr-num">$1</code>');

export function methodSection(md: string, lang: Lang): string {
  const [head, rest = ""] = md.split("<!-- en -->");
  const [en, ar = ""] = rest.split("<!-- ar -->");
  return head.replace(/^#.*$/m, "") + (lang === "ar" ? ar : en);
}

export function renderMd(md: string): string {
  const out: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p class="mb-4">${inline(para.join(" "))}</p>`), (para = []);
    if (list.length) out.push(`<ul class="mb-4 list-disc ps-6">${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`), (list = []);
  };
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { flush(); const n = h[1].length + 1; out.push(`<h${n} class="${n === 2 ? "text-2xl" : "text-lg"} mt-6 mb-2 font-bold">${inline(h[2])}</h${n}>`); continue; }
    if (line.startsWith("- ")) { if (para.length) flush(); list.push(line.slice(2)); continue; }
    para.push(line);
  }
  flush();
  return out.join("\n");
}
