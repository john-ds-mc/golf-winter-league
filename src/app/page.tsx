"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LeagueData, DEFAULT_LEAGUE_DATA } from "@/lib/types";
import { getStandings, isWeekComplete, getWeekScoreCount, getTotalPlayerCount } from "@/lib/scoring";
import { StandingsTable } from "@/components/standings-table";

export default function Dashboard() {
  const [data, setData] = useState<LeagueData>(DEFAULT_LEAGUE_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/league")
      .then((res) => res.json())
      .then((d: LeagueData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  const standings = getStandings(data);
  const totalPlayers = getTotalPlayerCount(data);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="font-serif text-[32px] italic text-neutral-900">
          {data.config.leagueName}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          {data.teams.length} teams, {totalPlayers} players, {data.config.numberOfWeeks} weeks
          <span className="mx-1.5">&middot;</span>
          {data.config.scoringFormat === "stableford" ? "Stableford" : "Stroke Play"}
        </p>
      </div>

      {/* Standings */}
      {data.teams.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
              Standings
            </h2>
            <Link
              href="/standings"
              className="text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Full breakdown
            </Link>
          </div>
          <StandingsTable standings={standings} config={data.config} />
        </section>
      )}

      {/* Weeks */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Weeks
        </h2>
        <div className="border-t border-neutral-200">
          {Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
            const weekNum = i + 1;
            const hasScores = isWeekComplete(data, weekNum);
            const scoreCount = getWeekScoreCount(data, weekNum);
            const isLast =
              weekNum === data.config.numberOfWeeks &&
              data.config.doublePointsLastWeek;

            return (
              <Link
                key={weekNum}
                href={`/week/${weekNum}`}
                className="flex items-center justify-between border-b border-neutral-100 py-3 transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-neutral-900">
                    Week {weekNum}
                  </span>
                  {isLast && (
                    <span className="text-[11px] font-medium text-primary-600">
                      2x
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-neutral-400">
                    {hasScores
                      ? `${scoreCount} score${scoreCount !== 1 ? "s" : ""}`
                      : "No scores"}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasScores ? "bg-primary-500" : "bg-neutral-200"
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {data.teams.length === 0 && (
        <p className="text-sm text-neutral-500">
          No teams yet.{" "}
          <Link
            href="/setup"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Set up your league
          </Link>
        </p>
      )}
    </div>
  );
}
