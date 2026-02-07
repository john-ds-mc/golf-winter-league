"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LeagueData, DEFAULT_LEAGUE_DATA } from "@/lib/types";
import { getStandings, getTeamWeekResult } from "@/lib/scoring";
import { StandingsTable } from "@/components/standings-table";

export default function StandingsPage() {
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

  return (
    <div className="space-y-12">
      {/* Print-only header with logo */}
      <div className="print-header hidden items-center gap-3 pb-4 border-b border-neutral-200 mb-6">
        <Image src="/logo.png" alt="RBGC" width={40} height={47} />
        <div>
          <div className="text-[18px] font-bold">{data.config.leagueName}</div>
          <div className="text-[12px]">
            {data.config.scoringFormat === "stableford" ? "Stableford" : "Stroke Play"}
            {" \u00b7 "}Best {data.config.bestScoresCount} scores
            {data.config.doublePointsLastWeek ? " \u00b7 Double points final week" : ""}
          </div>
        </div>
      </div>

      <div>
        <div className="no-print">
          <Link
            href="/"
            className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Dashboard
          </Link>
        </div>
        <div className="flex items-baseline justify-between">
          <h1 className="mt-1 font-serif text-[32px] italic text-neutral-900">
            Standings
          </h1>
          <button
            onClick={() => window.print()}
            className="no-print text-[13px] text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Print
          </button>
        </div>
        <p className="mt-0.5 text-[13px] text-neutral-500">
          {data.config.leagueName}
          <span className="mx-1.5">&middot;</span>
          {data.config.scoringFormat === "stableford"
            ? "Stableford"
            : "Stroke Play"}
        </p>
      </div>

      {/* Overall */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Overall
        </h2>
        <StandingsTable standings={standings} config={data.config} />
      </section>

      {/* Weekly breakdown */}
      {Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
        const weekNum = i + 1;
        const results = getTeamWeekResult(data, weekNum);
        const isLastWeek = weekNum === data.config.numberOfWeeks;
        const hasScores = results.some((r) =>
          r.allScores.some((s) => s.score !== null)
        );

        if (!hasScores) return null;

        return (
          <section key={weekNum}>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
                Week {weekNum}
              </h2>
              {isLastWeek && data.config.doublePointsLastWeek && (
                <span className="text-[11px] font-medium text-primary-600">
                  2x
                </span>
              )}
            </div>

            <div className="space-y-8">
              {results.map((result) => (
                <div key={result.teamId}>
                  <div className="flex items-baseline justify-between pb-2">
                    <h3 className="text-[15px] font-semibold text-neutral-900">
                      {result.teamName}
                    </h3>
                    <span className="text-[13px] tabular-nums text-neutral-500">
                      <span className="font-semibold text-neutral-900">
                        {result.countingTotal}
                      </span>
                      {isLastWeek && data.config.doublePointsLastWeek && (
                        <span className="ml-1.5 text-primary-600">
                          ({result.adjustedTotal})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="border-t border-neutral-200">
                    {result.allScores.map((s) => (
                      <div
                        key={s.playerId}
                        className={`flex items-center justify-between border-b border-neutral-100 py-1.5 ${
                          s.counting ? "bg-primary-50/60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {s.counting && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                          )}
                          <span
                            className={`text-[13px] ${
                              s.counting
                                ? "font-medium text-neutral-900"
                                : "text-neutral-500"
                            }`}
                          >
                            {s.playerName}
                          </span>
                        </div>
                        <span
                          className={`text-[13px] tabular-nums ${
                            s.counting
                              ? "font-medium text-neutral-900"
                              : "text-neutral-400"
                          }`}
                        >
                          {s.score !== null ? s.score : "\u2014"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {data.teams.length === 0 && (
        <p className="text-sm text-neutral-500">
          No teams configured yet.{" "}
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
