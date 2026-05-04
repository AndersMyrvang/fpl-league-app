"use client";

import { useEffect } from "react";

export type RecentLeague = {
  leagueId: string;
  leagueName: string;
  visitedAt: number;
};

const STORAGE_KEY = "recentLeagues";
const MAX = 5;

export function saveRecentLeague(leagueId: string, leagueName: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: RecentLeague[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((l) => l.leagueId !== leagueId);
    const updated = [{ leagueId, leagueName, visitedAt: Date.now() }, ...filtered].slice(0, MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

export function getRecentLeagues(): RecentLeague[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function RecentLeagueSaver({
  leagueId,
  leagueName,
}: {
  leagueId: string;
  leagueName: string;
}) {
  useEffect(() => {
    saveRecentLeague(leagueId, leagueName);
  }, [leagueId, leagueName]);

  return null;
}
