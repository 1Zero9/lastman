"use client";

import { useState } from "react";
import { gameWeeks } from "@/data/fixtures";
import { FixtureCard } from "@/components/FixtureCard";

export default function FixturesPage() {
  const [selectedGwId, setSelectedGwId] = useState(gameWeeks[0]?.id ?? "GW1");
  const gameWeek = gameWeeks.find((gw) => gw.id === selectedGwId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>

      {gameWeeks.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {gameWeeks.map((gw) => (
            <button
              key={gw.id}
              onClick={() => setSelectedGwId(gw.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                selectedGwId === gw.id
                  ? "bg-rvr-maroon text-white shadow-sm"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-rvr-maroon"
              }`}
            >
              {gw.id}
            </button>
          ))}
        </div>
      )}

      {gameWeek && (
        <>
          <div className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-rvr-maroon" />
              <p className="font-semibold text-gray-900">{gameWeek.label}</p>
            </div>
            <p className="mt-1 pl-4 text-sm text-gray-500">Cut-off: {gameWeek.cutOff}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gameWeek.fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
