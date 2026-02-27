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
            The competition kicks off on the Premier League fixtures weekend of Friday 27 February 2026
            (Gameweek 1). You pick one team each gameweek; if your team wins you are through to the
            next round, if they draw or lose you are out.
          </li>
          <li>Entry fee: €10 per person (once-off, covers all rounds). You can enter as many times as you like.</li>
          <li>
            Pay via <a href="https://revolut.me/jasons78" className="font-medium text-rvr-maroon underline hover:no-underline" target="_blank" rel="noopener noreferrer">revolut.me/jasons78</a> (0833746682) where possible, or cash to Rivervalley coach representatives (Dave, Aidan, Rui or Stephen).
          </li>
          <li>Each player &amp; coach is expected to secure at least 5 entries.</li>
          <li>
            30% of total funds go to prize money (minimum €250 for the winner(s)); the more entries,
            the higher the prize and more for the trip.
          </li>
          <li>70% of total funds go to the players&apos; trip costs. The more you raise, the cheaper the trip.</li>
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          Example: 100 entrants at €10 each → €300 prize money, €700 to the Player Fundraising Trip pot.
        </p>
      </>
    ),
  },
  {
    id: "whatsapp",
    title: "WhatsApp competition group",
    content: (
      <ul className="list-inside list-disc space-y-1.5 text-gray-700">
        <li>The WhatsApp group is for information only (you cannot ask questions or post).</li>
        <li>Contact the coaches for any questions or concerns.</li>
        <li>Organiser Jay Stanley will share the weekend fixtures in advance of each gameweek.</li>
        <li>Send your pick to your team representative asap each gameweek.</li>
        <li>
          Cut-off: 6pm on the Friday before a gameweek (or Thursday if there is a Friday PL fixture).
          If no pick is received by then, you are assigned the most popular team of that gameweek.
        </li>
        <li>All picks will be shared on the group by 9pm each Friday (or Thursday if Friday game).</li>
        <li>
          If all remaining participants are eliminated in the final round: 5 or fewer left → prize pot
          split; over 5 left → roll over to the next gameweek.
        </li>
      </ul>
    ),
  },
  {
    id: "top6",
    title: "Top 6 team rule",
    content: (
      <div className="space-y-2 text-gray-700">
        <p>
          For the Top 6 teams — Arsenal, Man City, Aston Villa, Man United, Chelsea and Liverpool — you
          can only select <strong>one</strong> of these six <strong>once</strong> in the entire competition.
        </p>
        <p className="text-sm text-gray-500">
          E.g. If you select Bournemouth in Gameweek 1, you cannot pick Bournemouth again. If you
          select Arsenal in Gameweek 1, you cannot pick Arsenal, Man City, Aston Villa, Man United,
          Chelsea or Liverpool for the rest of the competition.
        </p>
      </div>
    ),
  },
  {
    id: "disputes",
    title: "Disputes",
    content: (
      <p className="text-gray-700">
        Any disputes will be settled by the organising team (Jay, Dave, Aidan, Rui and Stephen) on a
        simple one-vote-per-person basis.
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
