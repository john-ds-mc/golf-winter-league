"use client";

import { StandingsRow } from "@/lib/scoring";
import { LeagueConfig } from "@/lib/types";

interface StandingsTableProps {
  standings: StandingsRow[];
  config: LeagueConfig;
  compact?: boolean;
}

export function StandingsTable({ standings, config, compact }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-400">
        No teams configured yet. Go to Setup to add teams.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-neutral-200">
            <th className="pb-2 pr-4 text-left font-medium text-neutral-500">
              #
            </th>
            <th className="pb-2 pr-4 text-left font-medium text-neutral-500">
              Team
            </th>
            {!compact &&
              Array.from({ length: config.numberOfWeeks }, (_, i) => (
                <th
                  key={i}
                  className="pb-2 px-3 text-right font-medium text-neutral-500"
                >
                  W{i + 1}
                  {i + 1 === config.numberOfWeeks && config.doublePointsLastWeek && (
                    <span className="ml-0.5 text-primary-600">*</span>
                  )}
                </th>
              ))}
            <th className="pb-2 pl-3 text-right font-medium text-neutral-900">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, idx) => (
            <tr
              key={row.teamId}
              className={`border-b border-neutral-100 ${idx === 0 ? "bg-primary-50/50" : ""}`}
            >
              <td className="py-2.5 pr-4 tabular-nums text-neutral-400">
                {row.rank}
              </td>
              <td className="py-2.5 pr-4 font-medium text-neutral-900">
                {row.teamName}
              </td>
              {!compact &&
                row.weeklyTotals.map((total, i) => (
                  <td
                    key={i}
                    className="py-2.5 px-3 text-right tabular-nums text-neutral-500"
                  >
                    {total !== null ? total : "\u2014"}
                  </td>
                ))}
              <td className="py-2.5 pl-3 text-right font-semibold tabular-nums text-neutral-900">
                {row.overallTotal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact && config.doublePointsLastWeek && (
        <p className="mt-2 text-[11px] text-neutral-400">
          <span className="text-primary-600">*</span> Double points
        </p>
      )}
    </div>
  );
}
