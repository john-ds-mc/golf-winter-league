"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeagueData, DEFAULT_LEAGUE_DATA } from "@/lib/types";
import { TeamBuilder } from "@/components/team-builder";
import { useAuth } from "@/lib/use-auth";

export default function SetupPage() {
  const [data, setData] = useState<LeagueData>(DEFAULT_LEAGUE_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
      .then((d: LeagueData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);

    const weeks = Array.from({ length: data.config.numberOfWeeks }, (_, i) => {
      const existing = data.weeks.find((w) => w.weekNumber === i + 1);
      if (existing) return existing;
      const scores = data.teams.flatMap((team) =>
        team.players.map((player) => ({
          playerId: player.id,
          teamId: team.id,
          score: null as number | null,
        }))
      );
      return { weekNumber: i + 1, scores };
    });

    const updated = { ...data, weeks };

    await fetch("/api/league", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    setData(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                setData({
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
                  setData({
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
                  setData({
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
                  setData({
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
                Best scores count
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={data.config.bestScoresCount}
                onChange={(e) =>
                  setData({
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
                    setData({
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

      {/* Teams */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
          Teams & Players
        </h2>
        <TeamBuilder
          teams={data.teams}
          onChange={(teams) => setData({ ...data, teams })}
        />
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 border-t border-neutral-200 pt-6">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-[13px] text-primary-600">Saved</span>
        )}
      </div>
    </div>
  );
}
