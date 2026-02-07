"use client";

import { Team, Player } from "@/lib/types";

interface TeamBuilderProps {
  teams: Team[];
  onChange: (teams: Team[]) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function TeamBuilder({ teams, onChange }: TeamBuilderProps) {
  function addTeam() {
    onChange([
      ...teams,
      { id: generateId(), name: `Team ${teams.length + 1}`, players: [] },
    ]);
  }

  function removeTeam(teamId: string) {
    onChange(teams.filter((t) => t.id !== teamId));
  }

  function updateTeamName(teamId: string, name: string) {
    onChange(teams.map((t) => (t.id === teamId ? { ...t, name } : t)));
  }

  function addPlayer(teamId: string) {
    onChange(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          players: [
            ...t.players,
            { id: generateId(), name: `Player ${t.players.length + 1}` },
          ],
        };
      })
    );
  }

  function removePlayer(teamId: string, playerId: string) {
    onChange(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          players: t.players.filter((p) => p.id !== playerId),
        };
      })
    );
  }

  function updatePlayerName(
    teamId: string,
    playerId: string,
    name: string
  ) {
    onChange(
      teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          players: t.players.map((p: Player) =>
            p.id === playerId ? { ...p, name } : p
          ),
        };
      })
    );
  }

  return (
    <div className="space-y-6">
      {teams.map((team) => (
        <div key={team.id}>
          <div className="flex items-center gap-3 pb-2">
            <input
              type="text"
              value={team.name}
              onChange={(e) => updateTeamName(team.id, e.target.value)}
              className="flex-1 border-b border-neutral-200 bg-transparent pb-1 text-[15px] font-semibold text-neutral-900 focus:border-primary-500 focus:outline-none"
            />
            <button
              onClick={() => removeTeam(team.id)}
              className="text-[12px] text-neutral-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          </div>
          <div className="border-t border-neutral-200">
            {team.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 border-b border-neutral-100 py-1.5"
              >
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) =>
                    updatePlayerName(team.id, player.id, e.target.value)
                  }
                  className="flex-1 bg-transparent text-[13px] text-neutral-700 focus:text-neutral-900 focus:outline-none"
                />
                <button
                  onClick={() => removePlayer(team.id, player.id)}
                  className="text-[12px] text-neutral-300 hover:text-red-500 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => addPlayer(team.id)}
            className="mt-1 text-[12px] font-medium text-neutral-400 hover:text-primary-600 transition-colors"
          >
            + Add player
          </button>
        </div>
      ))}
      <button
        onClick={addTeam}
        className="text-[13px] font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        + Add team
      </button>
    </div>
  );
}
