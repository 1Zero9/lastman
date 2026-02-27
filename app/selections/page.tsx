"use client";

import { useState } from "react";
import { selectionCountsByGw, gameWeekIds } from "@/data/selectionCounts";

const MAX_COUNT = Math.max(
  ...gameWeekIds.flatMap((id) => selectionCountsByGw[id].map((s) => s.count))
);

export default function SelectionsPage() {
  const [selectedGwId, setSelectedGwId] = useState(gameWeekIds[0] ?? "GW1");
  const counts = selectionCountsByGw[selectedGwId] ?? [];
  const total = counts.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Selections</h1>
        <span className="rounded-full bg-rvr-maroon-muted px-3 py-1 text-xs font-semibold text-rvr-maroon">
          {total} total picks
        </span>
      </div>

      {gameWeekIds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {gameWeekIds.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedGwId(id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                selectedGwId === id
                  ? "bg-rvr-maroon text-white shadow-sm"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-rvr-maroon"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="space-y-4">
          {counts.map(({ team, count }) => {
            const pct = Math.round((count / total) * 100);
            const barWidth = Math.max(2, (count / MAX_COUNT) * 100);
            return (
              <div key={team} className="flex items-center gap-4">
                <div className="w-28 shrink-0 text-sm font-semibold text-gray-800">{team}</div>
                <div className="min-w-0 flex-1">
                  <div className="h-7 overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-rvr-maroon to-rvr-maroon-light px-2 transition-all"
                      style={{ width: `${barWidth}%` }}
                    >
                      {barWidth > 20 && (
                        <span className="text-xs font-bold text-white">{count}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-20 shrink-0 text-right">
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                  <span className="ml-1 text-xs text-gray-400">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
