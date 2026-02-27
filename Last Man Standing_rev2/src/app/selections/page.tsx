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
      <h1 className="text-2xl font-bold text-gray-900">Selections by team</h1>

      {gameWeekIds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {gameWeekIds.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedGwId(id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                selectedGwId === id
                  ? "border-rvr-maroon bg-rvr-maroon text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      <p className="text-gray-600">
        Number of entrants who picked each team for {selectedGwId}. Grand total: <strong>{total}</strong>.
      </p>

      <div className="space-y-3">
        {counts.map(({ team, count }) => (
          <div key={team} className="flex items-center gap-4">
            <div className="w-32 shrink-0 font-medium text-gray-900">{team}</div>
            <div className="min-w-0 flex-1">
              <div
                className="h-8 rounded bg-rvr-maroon/40"
                style={{ width: `${Math.max(4, (count / MAX_COUNT) * 100)}%` }}
              />
            </div>
            <div className="w-12 shrink-0 text-right font-medium text-gray-700">{count}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-rvr-maroon/20 bg-rvr-maroon-muted p-4">
        <p className="font-medium text-gray-900">Grand total: {total}</p>
      </div>
    </div>
  );
}
