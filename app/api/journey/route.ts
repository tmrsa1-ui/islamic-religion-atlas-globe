import { NextResponse } from "next/server";
import { buildJourney } from "@/lib/journey";

// POST /api/journey { iso3, background?, question? } — retrieval only from /data JSON.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { ar: "طلب غير صالح.", en: "Invalid JSON body." } }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: { ar: "طلب غير صالح.", en: "Body must be an object." } }, { status: 400 });
  const res = buildJourney(body as Record<string, unknown>);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data, { headers: { "cache-control": "no-store" } });
}

export function GET() {
  return NextResponse.json(
    { usage: 'POST {"iso3":"IND","background":"hindu","question":"optional"}', backgrounds: ["christian", "unaffiliated", "hindu", "buddhist_ea", "unspecified"] },
    { status: 405, headers: { allow: "POST" } },
  );
}
