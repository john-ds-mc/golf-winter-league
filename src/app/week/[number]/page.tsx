"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { LeagueData, DEFAULT_LEAGUE_DATA, WeekScore } from "@/lib/types";
import { getTeamWeekResult, getWeekLeaguePoints } from "@/lib/scoring";
import { ScoreGrid } from "@/components/score-grid";
import { useAuth } from "@/lib/use-auth";

export default function WeekPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  const weekNumber = parseInt(number, 10);
  const [data, setData] = useState<LeagueData>(DEFAULT_LEAGUE_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetch("/api/league")
      .then((res) => res.json())
      .then((d: LeagueData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const handleScoreChange = useCallback(
    (teamId: string, playerId: string, score: number | null) => {
      setData((prev) => {
        const weeks = [...prev.weeks];
        let weekIndex = weeks.findIndex((w) => w.weekNumber === weekNumber);

        if (weekIndex === -1) {
          const scores: WeekScore[] = prev.teams.flatMap((team) =>
            team.players.map((player) => ({
              playerId: player.id,
              teamId: team.id,
              score: null,
            }))
          );
          weeks.push({ weekNumber, scores });
          weekIndex = weeks.length - 1;
        }

        const week = { ...weeks[weekIndex] };
        const scores = [...week.scores];

        const existingIndex = scores.findIndex(
          (s) => s.playerId === playerId && s.teamId === teamId
        );

        if (existingIndex >= 0) {
          scores[existingIndex] = { ...scores[existingIndex], score };
        } else {
          scores.push({ playerId, teamId, score });
        }

        week.scores = scores;
        weeks[weekIndex] = week;
        return { ...prev, weeks };
      });
    },
    [weekNumber]
  );

  async function save() {
    setSaving(true);
    setSaved(false);

    try {
      // Re-fetch latest to avoid overwriting config/team changes from setup
      const latest = await fetch("/api/league").then((r) => r.json()) as LeagueData;

      // Merge: keep latest config + teams, only replace this week's scores
      const localWeek = data.weeks.find((w) => w.weekNumber === weekNumber);
      const weeks = [...latest.weeks];
      const existingIdx = weeks.findIndex((w) => w.weekNumber === weekNumber);

      if (localWeek) {
        if (existingIdx >= 0) {
          weeks[existingIdx] = localWeek;
        } else {
          weeks.push(localWeek);
        }
      }

      const merged: LeagueData = { ...latest, weeks };

      const res = await fetch("/api/league", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });

      if (!res.ok) {
        throw new Error(res.status === 401 ? "Not authorized" : "Save failed");
      }

      setData(merged);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  if (weekNumber < 1 || weekNumber > data.config.numberOfWeeks) {
    return (
      <div className="py-20 text-center text-sm text-neutral-400">
        Invalid week number.{" "}
        <Link href="/" className="text-primary-600 hover:text-primary-700">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isLastWeek = weekNumber === data.config.numberOfWeeks;
  const teamResults = getTeamWeekResult(data, weekNumber);
  const leagueResults = getWeekLeaguePoints(data, weekNumber);

  const week = data.weeks.find((w) => w.weekNumber === weekNumber);
  const scores = week?.scores ?? [];

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/"
            className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Dashboard
          </Link>
          <h1 className="mt-1 font-serif text-[32px] italic text-neutral-900">
            Week {weekNumber}
          </h1>
          {isLastWeek && data.config.doublePointsLastWeek && (
            <p className="mt-0.5 text-[13px] font-medium text-primary-600">
              Double points
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3 pt-6">
            {saved && (
              <span className="text-[13px] text-primary-600">Saved</span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {data.teams.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No teams configured.{" "}
          <Link
            href="/setup"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Set up your league first
          </Link>
        </p>
      ) : (
        <div className="space-y-10">
          {data.teams.map((team) => {
            const teamResult = teamResults.find((r) => r.teamId === team.id);
            const leagueResult = leagueResults.find((r) => r.teamId === team.id);
            const countingIds = new Set(
              teamResult?.allScores
                .filter((s) => s.counting)
                .map((s) => s.playerId) ?? []
            );
            const teamScores = scores.filter((s) => s.teamId === team.id);

            return (
              <ScoreGrid
                key={team.id}
                team={team}
                scores={teamScores}
                config={data.config}
                countingPlayerIds={countingIds}
                onScoreChange={(playerId, score) =>
                  handleScoreChange(team.id, playerId, score)
                }
                teamTotal={teamResult?.countingTotal ?? 0}
                rank={leagueResult?.rank}
                leaguePoints={leagueResult?.adjustedLeaguePoints}
                readOnly={!isAdmin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
