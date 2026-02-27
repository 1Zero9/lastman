import type { Fixture } from "@/types/lms";

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
        {fixture.date}
        {fixture.kickoff && <span className="ml-2">· {fixture.kickoff}</span>}
      </p>
      <div className="flex items-center gap-3 text-center">
        <div className="flex-1">
          <p className="font-bold text-gray-900">{fixture.home}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">Home</p>
        </div>
        <div className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-500">
          VS
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{fixture.away}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">Away</p>
        </div>
      </div>
    </div>
  );
}
