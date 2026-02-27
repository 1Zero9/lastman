import type { Fixture } from "@/types/lms";

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{fixture.date}</p>
      <p className="mt-1 font-medium text-gray-900">
        {fixture.home} <span className="text-gray-400">v</span> {fixture.away}
      </p>
    </div>
  );
}
