"use client";

import { useMemo, useState } from "react";
import { entries } from "@/data/entries";
import { StatusBadge } from "@/components/StatusBadge";
import type { Entry } from "@/types/lms";

type SortKey = "id" | "entrantName" | "playerName" | "GW1" | "status";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="ml-1 opacity-25">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

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
    else { setSortKey(key); setSortDir("asc"); }
  };

  const selectClass = "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-rvr-maroon focus:bg-white";

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Standings</h1>
        <span className="text-sm text-gray-500">
          {filtered.length} of {entries.length} entries
        </span>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Search
            </label>
            <input
              id="search"
              type="text"
              placeholder="Entrant or coordinator…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="player" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Coordinator
            </label>
            <select id="player" value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {players.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="team" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              GW1 team
            </label>
            <select id="team" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Status
            </label>
            <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={selectClass}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="eliminated">Out</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
          <thead>
            <tr className="bg-rvr-maroon text-white">
              {(
                [
                  { key: "id", label: "#" },
                  { key: "entrantName", label: "Entrant" },
                  { key: "playerName", label: "Coordinator" },
                  { key: "GW1", label: "GW1 pick" },
                  { key: "status", label: "Status" },
                ] as { key: SortKey; label: string }[]
              ).map(({ key, label }) => (
                <th
                  key={key}
                  className="cursor-pointer select-none px-4 py-3 font-semibold hover:bg-white/10"
                  onClick={() => handleSort(key)}
                >
                  {label}
                  <SortIcon active={sortKey === key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {filtered.map((entry) => (
              <tr
                key={entry.id}
                className={`transition-colors ${
                  entry.status === "eliminated"
                    ? "bg-red-50/50 hover:bg-red-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{entry.id}</td>
                <td className={`px-4 py-3 font-medium ${entry.status === "eliminated" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                  {entry.entrantName}
                </td>
                <td className="px-4 py-3 text-gray-500">{entry.playerName}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{entry.picks.GW1 ?? "–"}</td>
                <td className="px-4 py-3">
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
