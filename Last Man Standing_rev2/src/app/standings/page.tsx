"use client";

import { useMemo, useState } from "react";
import { entries } from "@/data/entries";
import { StatusBadge } from "@/components/StatusBadge";
import type { Entry } from "@/types/lms";

type SortKey = "id" | "entrantName" | "playerName" | "GW1" | "status";

export default function StandingsPage() {
  const [playerFilter, setPlayerFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "eliminated">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const players = useMemo(() => {
    const set = new Set(entries.map((e) => e.playerName));
    return Array.from(set).sort();
  }, []);

  const teams = useMemo(() => {
    const set = new Set(entries.map((e) => e.picks.GW1).filter(Boolean));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (playerFilter) list = list.filter((e) => e.playerName === playerFilter);
    if (teamFilter) list = list.filter((e) => e.picks.GW1 === teamFilter);
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.entrantName.toLowerCase().includes(q) ||
          e.playerName.toLowerCase().includes(q)
      );
    }
    const getSortVal = (e: Entry): string | number => {
      if (sortKey === "id") return e.id;
      if (sortKey === "GW1") return e.picks.GW1 ?? "";
      if (sortKey === "entrantName") return e.entrantName;
      if (sortKey === "playerName") return e.playerName;
      return e.status;
    };
    list.sort((a, b) => {
      const aVal = getSortVal(a);
      const bVal = getSortVal(b);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [playerFilter, teamFilter, statusFilter, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Standings</h1>

      <div className="flex flex-wrap gap-4 rounded-lg border border-rvr-maroon/20 bg-rvr-maroon-muted p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-sm font-medium text-gray-700">Search</label>
          <input
            id="search"
            type="text"
            placeholder="Entrant or player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="player" className="text-sm font-medium text-gray-700">Player / coordinator</label>
          <select
            id="player"
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {players.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="team" className="text-sm font-medium text-gray-700">GW1 team</label>
          <select
            id="team"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-gray-700">Status</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="eliminated">Out</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Showing {filtered.length} of {entries.length} entries.
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-rvr-maroon text-white">
            <tr>
              <th className="cursor-pointer px-4 py-2 font-semibold" onClick={() => handleSort("id")}>
                # {sortKey === "id" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="cursor-pointer px-4 py-2 font-semibold" onClick={() => handleSort("entrantName")}>
                Entrant {sortKey === "entrantName" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="cursor-pointer px-4 py-2 font-semibold" onClick={() => handleSort("playerName")}>
                Player / coordinator {sortKey === "playerName" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="cursor-pointer px-4 py-2 font-semibold" onClick={() => handleSort("GW1")}>
                GW1 {sortKey === "GW1" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="cursor-pointer px-4 py-2 font-semibold" onClick={() => handleSort("status")}>
                Status {sortKey === "status" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filtered.map((entry) => (
              <tr key={entry.id} className={entry.status === "eliminated" ? "bg-red-50/50" : ""}>
                <td className="px-4 py-2 font-medium">{entry.id}</td>
                <td className="px-4 py-2">{entry.entrantName}</td>
                <td className="px-4 py-2 text-gray-600">{entry.playerName}</td>
                <td className="px-4 py-2">{entry.picks.GW1 ?? "–"}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
