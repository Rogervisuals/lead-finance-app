import { NextResponse } from "next/server";
import { fetchFxRateFromProviders } from "@/lib/finance/exchange-rate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = String(url.searchParams.get("from") ?? "").trim().toUpperCase();
  const to = String(url.searchParams.get("to") ?? "").trim().toUpperCase();

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const rate = await fetchFxRateFromProviders(from, to);
  if (rate == null) {
    return NextResponse.json({ error: "Rate unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { rate, from, to, fetchedAt: Date.now() },
    {
      status: 200,
      headers: {
        // Keep responses fresh while still allowing very short reuse.
        "Cache-Control": "public, max-age=15, s-maxage=15",
      },
    }
  );
}
