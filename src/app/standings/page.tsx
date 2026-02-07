"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LeagueData, DEFAULT_LEAGUE_DATA } from "@/lib/types";
import { getStandings, getTeamWeekResult, getWeekLeaguePoints, isWeekComplete } from "@/lib/scoring";
import { StandingsTable } from "@/components/standings-table";

export default function StandingsPage() {
  const [data, setData] = useState<LeagueData>(DEFAULT_LEAGUE_DATA);
  const [loading, setLoading] = useState(true);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printWeek, setPrintWeek] = useState<number | null>(null); // null = all weeks

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
            {" \u00b7 "}{data.config.scoringFormat === "stableford" ? "Top" : "Low"} {data.config.bestScoresCount} scores
            {data.config.doublePointsLastWeek ? " \u00b7 Double points final week" : ""}
          </div>
        </div>
      </div>

      <div className="no-print">
        <Link
          href="/"
          className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Dashboard
        </Link>
        <div className="flex items-baseline justify-between">
          <h1 className="mt-1 font-serif text-[32px] italic text-neutral-900">
            Standings
          </h1>
          <button
            onClick={() => setShowPrintDialog(true)}
            className="text-[13px] text-neutral-400 hover:text-neutral-900 transition-colors"
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

      {/* Print dialog */}
      {showPrintDialog && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-[15px] font-semibold text-neutral-900">
              Print week scores
            </h3>
            <p className="mt-1 text-[12px] text-neutral-500">
              Choose which week matrix to include.
            </p>
            <div className="mt-4 space-y-1">
              <button
                onClick={() => setPrintWeek(null)}
                className={`w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                  printWeek === null
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                All weeks
              </button>
              {Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
                const wn = i + 1;
                const hasScores = isWeekComplete(data, wn);
                return (
                  <button
                    key={wn}
                    onClick={() => setPrintWeek(wn)}
                    disabled={!hasScores}
                    className={`w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                      printWeek === wn
                        ? "bg-neutral-900 text-white"
                        : hasScores
                          ? "text-neutral-700 hover:bg-neutral-100"
                          : "text-neutral-300 cursor-not-allowed"
                    }`}
                  >
                    Week {wn}
                    {!hasScores && " (no scores)"}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setShowPrintDialog(false);
                  // Small delay so dialog hides before print
                  setTimeout(() => window.print(), 100);
                }}
                className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                Print
              </button>
              <button
                onClick={() => setShowPrintDialog(false)}
                className="rounded-md px-4 py-2 text-[13px] text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overall */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Overall
        </h2>
        <StandingsTable standings={standings} config={data.config} />
      </section>

      {/* Weekly breakdown (screen only) */}
      {Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
        const weekNum = i + 1;
        const results = getTeamWeekResult(data, weekNum);
        const leagueResults = getWeekLeaguePoints(data, weekNum);
        const isLastWeek = weekNum === data.config.numberOfWeeks;
        const hasScores = results.some((r) =>
          r.allScores.some((s) => s.score !== null)
        );

        if (!hasScores) return null;

        return (
          <section key={weekNum} className="no-print">
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
              {results.map((result) => {
                const lr = leagueResults.find((r) => r.teamId === result.teamId);
                return (
                  <div key={result.teamId}>
                    <div className="flex items-baseline justify-between pb-2">
                      <h3 className="text-[15px] font-semibold text-neutral-900">
                        {result.teamName}
                      </h3>
                      <span className="text-[13px] tabular-nums text-neutral-500">
                        <span className="font-semibold text-neutral-900">
                          {result.countingTotal}
                        </span>
                        {lr && (
                          <>
                            <span className="mx-1.5 text-neutral-300">&middot;</span>
                            <span className="text-neutral-400">#{lr.rank}</span>
                            <span className="mx-1.5 text-neutral-300">&middot;</span>
                            <span className="font-semibold text-primary-600">
                              {lr.adjustedLeaguePoints} pts
                            </span>
                          </>
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
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Print-only: weekly score matrices */}
      {Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
        const weekNum = i + 1;
        // Skip weeks not selected in print dialog
        if (printWeek !== null && printWeek !== weekNum) return null;

        const results = getTeamWeekResult(data, weekNum);
        const leagueResults = getWeekLeaguePoints(data, weekNum);
        const isLastWeek = weekNum === data.config.numberOfWeeks;
        const hasScores = results.some((r) =>
          r.allScores.some((s) => s.score !== null)
        );

        if (!hasScores) return null;

        const maxPlayers = Math.max(...data.teams.map((t) => t.players.length));
        const week = data.weeks.find((w) => w.weekNumber === weekNum);
        const weekScores = week?.scores ?? [];

        return (
          <section key={`print-${weekNum}`} className="print-matrix">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="RBGC" width={32} height={38} />
              <div>
                <div className="text-[14px] font-bold">{data.config.leagueName}</div>
                <div className="text-[11px]">
                  Week {weekNum}
                  {isLastWeek && data.config.doublePointsLastWeek ? " (Double Points)" : ""}
                  {" \u00b7 "}{data.config.scoringFormat === "stableford" ? "Top" : "Low"} {data.config.bestScoresCount} scores
                </div>
              </div>
            </div>
            <table className="print-table w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className="border border-neutral-300 px-2 py-1 text-left">#</th>
                  {data.teams.map((team, ti) => (
                    <th key={team.id} className="border border-neutral-300 px-2 py-1 text-center">
                      {team.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxPlayers }, (_, pi) => (
                  <tr key={pi}>
                    <td className="border border-neutral-300 px-2 py-1 text-neutral-500">
                      {pi + 1}
                    </td>
                    {data.teams.map((team) => {
                      const player = team.players[pi];
                      if (!player) {
                        return <td key={team.id} className="border border-neutral-300 px-2 py-1 text-center">&mdash;</td>;
                      }
                      const scoreEntry = weekScores.find(
                        (s) => s.playerId === player.id && s.teamId === team.id
                      );
                      const result = results.find((r) => r.teamId === team.id);
                      const playerScore = result?.allScores.find((s) => s.playerId === player.id);
                      const isCounting = playerScore?.counting ?? false;
                      return (
                        <td
                          key={team.id}
                          className={`border border-neutral-300 px-2 py-1 text-center tabular-nums ${
                            isCounting ? "font-bold" : ""
                          }`}
                        >
                          {scoreEntry?.score !== null && scoreEntry?.score !== undefined
                            ? scoreEntry.score
                            : "\u2014"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-neutral-900">
                  <td className="border border-neutral-300 px-2 py-1 font-bold">Total</td>
                  {data.teams.map((team) => {
                    const result = results.find((r) => r.teamId === team.id);
                    return (
                      <td key={team.id} className="border border-neutral-300 px-2 py-1 text-center font-bold tabular-nums">
                        {result?.countingTotal ?? "\u2014"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-2 py-1 font-bold">Rank</td>
                  {data.teams.map((team) => {
                    const lr = leagueResults.find((r) => r.teamId === team.id);
                    return (
                      <td key={team.id} className="border border-neutral-300 px-2 py-1 text-center tabular-nums">
                        {lr?.rank ?? "\u2014"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="border border-neutral-300 px-2 py-1 font-bold">Pts</td>
                  {data.teams.map((team) => {
                    const lr = leagueResults.find((r) => r.teamId === team.id);
                    return (
                      <td key={team.id} className="border border-neutral-300 px-2 py-1 text-center font-bold tabular-nums">
                        {lr?.adjustedLeaguePoints ?? "\u2014"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
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
