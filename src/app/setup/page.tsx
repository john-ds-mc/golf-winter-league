"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeagueData, DEFAULT_LEAGUE_DATA } from "@/lib/types";
import { TeamBuilder } from "@/components/team-builder";
import { useAuth } from "@/lib/use-auth";
import { generateDefaultLeaguePoints } from "@/lib/scoring";

export default function SetupPage() {
  const [data, setData] = useState<LeagueData>(DEFAULT_LEAGUE_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { isAdmin, checked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (checked && !isAdmin) {
      router.push("/");
    }
  }, [checked, isAdmin, router]);

  useEffect(() => {
    fetch("/api/league")
      .then((res) => res.json())
      .then((d: LeagueData) => { setData(d); setDirty(false); })
      .finally(() => setLoading(false));
  }, []);

  function update(next: LeagueData) {
    setData(next);
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);

    try {
      // Re-fetch latest to avoid overwriting scores entered on other pages
      const latest = await fetch("/api/league").then((r) => r.json()) as LeagueData;

      // Merge: take local config + teams, but preserve existing week scores
      const weeks = Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
        const weekNum = i + 1;
        const existing = latest.weeks.find((w) => w.weekNumber === weekNum);
        // Build full score slots for current teams/players
        const fullScores = data.teams.flatMap((team) =>
          team.players.map((player) => {
            // Preserve any existing score for this player
            const prev = existing?.scores.find(
              (s) => s.playerId === player.id && s.teamId === team.id
            );
            return {
              playerId: player.id,
              teamId: team.id,
              score: prev?.score ?? null as number | null,
            };
          })
        );
        return { weekNumber: weekNum, scores: fullScores };
      });

      const updated: LeagueData = { config: data.config, teams: data.teams, weeks };

      const res = await fetch("/api/league", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) {
        throw new Error(res.status === 401 ? "Not authorized" : "Save failed");
      }

      setData(updated);
      setDirty(false);
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

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-serif text-[32px] italic text-neutral-900">
          Setup
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Configure league settings, teams, and players.
        </p>
      </div>

      {/* Settings */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Settings
        </h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-neutral-700">
              League name
            </label>
            <input
              type="text"
              value={data.config.leagueName}
              onChange={(e) =>
                update({
                  ...data,
                  config: { ...data.config, leagueName: e.target.value },
                })
              }
              className="w-full border-b border-neutral-200 bg-transparent pb-1.5 text-[15px] text-neutral-900 focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-neutral-700">
              Scoring format
            </label>
            <div className="flex gap-0 rounded-md border border-neutral-200 overflow-hidden w-fit">
              <button
                onClick={() =>
                  update({
                    ...data,
                    config: { ...data.config, scoringFormat: "stableford" },
                  })
                }
                className={`px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  data.config.scoringFormat === "stableford"
                    ? "bg-neutral-900 text-white"
                    : "bg-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Stableford
              </button>
              <button
                onClick={() =>
                  update({
                    ...data,
                    config: { ...data.config, scoringFormat: "strokeplay" },
                  })
                }
                className={`px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  data.config.scoringFormat === "strokeplay"
                    ? "bg-neutral-900 text-white"
                    : "bg-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Stroke Play
              </button>
            </div>
            <p className="mt-1.5 text-[12px] text-neutral-400">
              {data.config.scoringFormat === "stableford"
                ? "Higher scores are better"
                : "Lower scores are better"}
            </p>
          </div>

          <div className="flex gap-8">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                Weeks
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={data.config.numberOfWeeks}
                onChange={(e) =>
                  update({
                    ...data,
                    config: {
                      ...data.config,
                      numberOfWeeks: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-20 border-b border-neutral-200 bg-transparent pb-1 text-[15px] tabular-nums text-neutral-900 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                {data.config.scoringFormat === "stableford" ? "Top" : "Low"} scores count
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={data.config.bestScoresCount}
                onChange={(e) =>
                  update({
                    ...data,
                    config: {
                      ...data.config,
                      bestScoresCount: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-20 border-b border-neutral-200 bg-transparent pb-1 text-[15px] tabular-nums text-neutral-900 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.config.doublePointsLastWeek}
                  onChange={(e) =>
                    update({
                      ...data,
                      config: {
                        ...data.config,
                        doublePointsLastWeek: e.target.checked,
                      },
                    })
                  }
                  className="h-3.5 w-3.5 rounded-sm border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-[13px] text-neutral-700">
                  Double last week
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* League Points */}
      {data.teams.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
              League Points
            </h2>
            <button
              onClick={() =>
                update({
                  ...data,
                  config: {
                    ...data.config,
                    leaguePoints: generateDefaultLeaguePoints(data.teams.length),
                  },
                })
              }
              className="text-[12px] text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              Reset defaults
            </button>
          </div>
          <p className="mb-3 text-[12px] text-neutral-400">
            Points awarded per finishing position each week.
          </p>
          <div className="border-t border-neutral-200">
            {Array.from({ length: data.teams.length }, (_, i) => {
              const pos = i + 1;
              const defaults = generateDefaultLeaguePoints(data.teams.length);
              const pts = data.config.leaguePoints?.[i] ?? defaults[i];
              return (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-neutral-100 py-2"
                >
                  <span className="text-[13px] text-neutral-600">
                    {pos === 1 ? "1st" : pos === 2 ? "2nd" : pos === 3 ? "3rd" : `${pos}th`}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={pts}
                    onChange={(e) => {
                      const current = data.config.leaguePoints ?? defaults;
                      const updated = [...current];
                      // Ensure array is long enough
                      while (updated.length < data.teams.length) {
                        updated.push(defaults[updated.length] ?? 1);
                      }
                      updated[i] = parseInt(e.target.value) || 0;
                      update({
                        ...data,
                        config: { ...data.config, leaguePoints: updated },
                      });
                    }}
                    className="w-16 border-b border-transparent bg-transparent py-0.5 text-right text-[13px] tabular-nums text-neutral-900 placeholder:text-neutral-300 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Teams */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Teams & Players
        </h2>
        <TeamBuilder
          teams={data.teams}
          onChange={(teams) => {
            const next = { ...data, teams };
            // Auto-resize league points when team count changes
            if (teams.length !== data.teams.length) {
              const defaults = generateDefaultLeaguePoints(teams.length);
              const current = data.config.leaguePoints ?? generateDefaultLeaguePoints(data.teams.length);
              const resized = Array.from({ length: teams.length }, (_, i) =>
                current[i] ?? defaults[i]
              );
              next.config = { ...next.config, leaguePoints: resized };
            }
            update(next);
          }}
        />
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 border-t border-neutral-200 pt-6">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-[13px] text-primary-600">Saved</span>
        )}
        {dirty && !saving && !saved && (
          <span className="text-[13px] text-neutral-400">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
