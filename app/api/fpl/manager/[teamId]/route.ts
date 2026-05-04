import { NextResponse } from "next/server";

async function fetchWithRetry(url: string, attempts = 3, delayMs = 300): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 60 },
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (res.ok) return res;
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }
  throw lastErr ?? new Error("FPL API unreachable after retries");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const id = Number(teamId);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  try {
    const res = await fetchWithRetry(
      `https://fantasy.premierleague.com/api/entry/${id}/history/`
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "FPL API error" }, { status: 502 });
  }
}
