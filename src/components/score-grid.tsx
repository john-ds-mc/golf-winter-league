"use client";

import { Team, WeekScore, LeagueConfig } from "@/lib/types";

interface ScoreGridProps {
  team: Team;
  scores: WeekScore[];
  config: LeagueConfig;
  countingPlayerIds: Set<string>;
  onScoreChange: (playerId: string, score: number | null) => void;
  teamTotal: number;
  readOnly?: boolean;
}

export function ScoreGrid({
  team,
  scores,
  config,
  countingPlayerIds,
  onScoreChange,
  teamTotal,
  readOnly,
}: ScoreGridProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between pb-2">
        <h3 className="text-[15px] font-semibold text-neutral-900">
          {team.name}
        </h3>
        <span className="text-[13px] tabular-nums text-neutral-500">
          Best {config.bestScoresCount}:{" "}
          <span className="font-semibold text-neutral-900">{teamTotal}</span>
        </span>
      </div>
      <div className="border-t border-neutral-200">
        {team.players.map((player) => {
          const scoreEntry = scores.find((s) => s.playerId === player.id);
          const value = scoreEntry?.score;
          const isCounting = countingPlayerIds.has(player.id);

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between border-b border-neutral-100 py-2 ${
                isCounting ? "bg-primary-50/60" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {isCounting && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                )}
                <span
                  className={`text-[13px] ${
                    isCounting
                      ? "font-medium text-neutral-900"
                      : "text-neutral-600"
                  }`}
                >
                  {player.name}
                </span>
              </div>
              {readOnly ? (
                <span className="text-[13px] tabular-nums text-neutral-900">
                  {value !== null && value !== undefined ? value : <span className="text-neutral-300">&mdash;</span>}
                </span>
              ) : (
                <input
                  type="number"
                  inputMode="numeric"
                  value={value ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      onScoreChange(player.id, null);
                    } else {
                      const num = parseInt(raw, 10);
                      if (!isNaN(num)) {
                        onScoreChange(player.id, num);
                      }
                    }
                  }}
                  className="w-16 border-b border-transparent bg-transparent py-0.5 text-right text-[13px] tabular-nums text-neutral-900 placeholder:text-neutral-300 focus:border-primary-500 focus:outline-none"
                  placeholder={config.scoringFormat === "stableford" ? "pts" : "strk"}
                />
              )}
            </div>
          );
        })}
        {team.players.length === 0 && (
          <p className="py-4 text-center text-[13px] text-neutral-400">
            No players added yet
          </p>
        )}
      </div>
    </div>
  );
}
