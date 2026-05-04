import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string; gw: string }> }
) {
  const { teamId, gw } = await params;
  const id = Number(teamId);
  const event = Number(gw);

  if (!id || isNaN(id) || !event || isNaN(event)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  // Fetch picks and bootstrap in parallel
  const [picksRes, bootstrapRes] = await Promise.all([
    fetch(`https://fantasy.premierleague.com/api/entry/${id}/event/${event}/picks/`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    }),
    fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      cache: "force-cache",
      headers: { "User-Agent": "Mozilla/5.0" },
    }),
  ]);

  if (!picksRes.ok) {
    return NextResponse.json({ error: "FPL picks API error" }, { status: picksRes.status });
  }
  if (!bootstrapRes.ok) {
    return NextResponse.json({ error: "FPL bootstrap API error" }, { status: bootstrapRes.status });
  }

  const picksData = await picksRes.json();
  const bootstrapData = await bootstrapRes.json();

  // Build element-id → code map from bootstrap
  const codeByElement = new Map<number, number>(
    (bootstrapData.elements as { id: number; code: number }[]).map((e) => [e.id, e.code])
  );

  const captain     = (picksData.picks as { element: number; is_captain: boolean }[]).find((p) => p.is_captain);
  const viceCaptain = (picksData.picks as { element: number; is_vice_captain: boolean }[]).find((p) => p.is_vice_captain);

  return NextResponse.json({
    captainCode:     captain     ? (codeByElement.get(captain.element)     ?? null) : null,
    viceCaptainCode: viceCaptain ? (codeByElement.get(viceCaptain.element) ?? null) : null,
  });
}
