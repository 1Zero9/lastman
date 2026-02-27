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

      {gameWeeks.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {gameWeeks.map((gw) => (
            <button
              key={gw.id}
              onClick={() => setSelectedGwId(gw.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                selectedGwId === gw.id
                  ? "border-rvr-maroon bg-rvr-maroon text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {gw.id}
            </button>
          ))}
        </div>
      ) : null}

      {gameWeek ? (
        <>
          <div className="rounded-lg border border-rvr-maroon/20 bg-rvr-maroon-muted p-4">
            <p className="font-medium text-gray-900">{gameWeek.label}</p>
            <p className="text-sm text-gray-600">Cut-off: {gameWeek.cutOff}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gameWeek.fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-gray-600">No fixtures for this gameweek.</p>
      )}
    </div>
  );
}
