"use client";

import { useState } from "react";

const sections = [
  {
    id: "how-it-works",
    title: "How it works",
    content: (
      <>
        <ul className="list-inside list-disc space-y-1.5 text-gray-700">
          <li>
            You pick one team each gameweek; if your team wins you are through to the
            next round, if they draw or lose you are out.
          </li>
          <li>The entry fee and number of entries available are set by the organiser for each season.</li>
          <li>
            Payment is arranged outside the platform. An organiser records and confirms payments here
            before entries become active.
          </li>
          <li>
            The organiser sets the share of confirmed entry fees allocated to the prize fund and the
            fundraising goal.
          </li>
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          The live view shows confirmed entries, the current prize fund and the fundraising total.
        </p>
      </>
    ),
  },
  {
    id: "deadlines",
    title: "Deadlines and updates",
    content: (
      <ul className="list-inside list-disc space-y-1.5 text-gray-700">
        <li>The organiser publishes fixtures and updates before every gameweek.</li>
        <li>Submit your pick through the platform before the displayed deadline.</li>
        <li>
          Each gameweek has a published deadline. If no pick is received by then, an eligible team is
          assigned using the competition&apos;s published autopick rule.
        </li>
        <li>
          If all remaining participants are eliminated in the final round: 5 or fewer left → prize pot
          split; over 5 left → roll over to the next gameweek.
        </li>
      </ul>
    ),
  },
  {
    id: "selection-rules",
    title: "Selection rules",
    content: (
      <div className="space-y-2 text-gray-700">
        <p>
          A team cannot be selected twice by the same entry. The organiser may also configure a
          restricted group of teams for a season.
        </p>
        <p className="text-sm text-gray-500">
          The available-team picker shows exactly what each entry can choose, based on its previous picks
          and the season rules.
        </p>
      </div>
    ),
  },
  {
    id: "buy-backs",
    title: "Buy-backs and voided rounds",
    content: (
      <ul className="list-inside list-disc space-y-1.5 text-gray-700">
        <li>
          If the organiser has enabled buy-backs, an eliminated entry can pay the entry fee again (offline,
          to the organiser) to rejoin — normally once per entry. The extra fee goes into the pot.
        </li>
        <li>
          The organiser may void a round (for example when fixtures are postponed). A voided round counts as
          a bye: nobody is eliminated and picks made that round are returned.
        </li>
      </ul>
    ),
  },
  {
    id: "your-data",
    title: "Your data",
    content: (
      <p className="text-gray-700">
        You confirm your own entry and consent to your name, email and picks being stored and shown in the
        competition. You can download or delete your data at any time from your account page. See the privacy
        policy and disclaimer linked in the footer.
      </p>
    ),
  },
  {
    id: "disputes",
    title: "Disputes",
    content: (
      <p className="text-gray-700">
        Any disputes are settled by the competition administrators. Decisions and manual overrides are
        recorded in the audit history.
      </p>
    ),
  },
];

export function RulesContent() {
  const [openId, setOpenId] = useState<string | null>("how-it-works");

  return (
    <div className="space-y-3">
      {sections.map(({ id, title, content }) => (
        <div
          key={id}
          className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100"
        >
          <button
            type="button"
            onClick={() => setOpenId(openId === id ? null : id)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
          >
            <span className="font-semibold text-gray-900">{title}</span>
            <span
              className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white transition-colors ${
                openId === id ? "bg-rvr-maroon" : "bg-gray-300"
              }`}
            >
              {openId === id ? "−" : "+"}
            </span>
          </button>
          {openId === id && (
            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
              {content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
