export type FPLPlayer = {
  id: number;
  code: number;
  photo: string;
  web_name: string;
  team: number;
  element_type: number; // 1 GK, 2 DEF, 3 MID, 4 FWD
};

export type FPLBootstrap = {
  elements: FPLPlayer[];
  teams: { id: number; name: string; short_name: string }[];
  events?: {
    id: number;
    name: string;
    is_current: boolean;
    is_next: boolean;
    deadline_time: string;
  }[];
};

const BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const ELEMENT_SUMMARY = (id: number) =>
  `https://fantasy.premierleague.com/api/element-summary/${id}/`;
// Server-side only — use fetchManagerHistory for client components
const MANAGER_HISTORY = (teamId: number) =>
  `https://fantasy.premierleague.com/api/entry/${teamId}/history/`;

export async function fetchBootstrap(): Promise<FPLBootstrap> {
  const res = await fetch(BOOTSTRAP_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load bootstrap");
  return res.json();
}

export async function fetchNextDeadline(): Promise<{
  id: number;
  name: string;
  deadline_time: string;
}> {
  const bootstrap = await fetchBootstrap();
  const events = bootstrap.events ?? [];
  const nextEvent = events.find((event) => event.is_next) ?? events.find((event) => event.is_current);

  if (!nextEvent) {
    throw new Error("No upcoming FPL event with a deadline was found.");
  }

  return {
    id: nextEvent.id,
    name: nextEvent.name,
    deadline_time: nextEvent.deadline_time
  };
}

export async function fetchPlayerGWPoints(playerId: number, gameweek: number) {
  const res = await fetch(ELEMENT_SUMMARY(playerId), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load element-summary");

  const data = await res.json();
  const history = data.history || [];
  return history.find((h: any) => h.round === gameweek)?.total_points ?? 0;
}

export type ManagerGWEntry = { event: number; points: number; total_points: number };

/**
 * Fetches a manager's full GW history via the server-side proxy route.
 * Safe to call from client components — avoids CORS issues.
 */
const apiBase = (): string => process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export async function fetchManagerHistory(teamId: number): Promise<ManagerGWEntry[]> {
  try {
    const res = await fetch(`${apiBase()}/api/fpl/manager/${teamId}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.current as ManagerGWEntry[]) ?? [];
  } catch {
    return [];
  }
}

/** Server-side only: fetch a single GW's points for a manager. */
export async function fetchManagerGWPoints(teamId: number, gameweek: number): Promise<number | null> {
  try {
    const res = await fetch(MANAGER_HISTORY(teamId), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const gw = (data.current as ManagerGWEntry[]).find((g) => g.event === gameweek);
    return gw?.points ?? null;
  } catch {
    return null;
  }
}

export function photoUrl(photo: string) {
  const base = photo.replace(".jpg", "");
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${base}.png`;
}

export function mapFPLRole(type: number) {
  return type === 1 ? "GK" : type === 2 ? "DEF" : type === 3 ? "MID" : "FWD";
}

export type TransferItem = {
  event: number;
  elementIn:  { id: number; name: string; code: number; club: string; role: string };
  elementOut: { id: number; name: string; code: number; club: string; role: string };
  costIn: number;
  costOut: number;
  time: string;
};

export async function fetchManagerTransfers(teamId: number): Promise<TransferItem[]> {
  try {
    const res = await fetch(`${apiBase()}/api/fpl/manager/${teamId}/transfers`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
