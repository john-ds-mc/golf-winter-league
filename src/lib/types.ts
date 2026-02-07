export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface WeekScore {
  playerId: string;
  teamId: string;
  score: number | null;
}

export interface Week {
  weekNumber: number;
  scores: WeekScore[];
}

export interface LeagueConfig {
  leagueName: string;
  scoringFormat: "stableford" | "strokeplay";
  numberOfWeeks: number;
  bestScoresCount: number;
  doublePointsLastWeek: boolean;
  leaguePoints?: number[]; // points per finishing position (1st, 2nd, …, last)
}

export interface LeagueData {
  config: LeagueConfig;
  teams: Team[];
  weeks: Week[];
}

export const DEFAULT_LEAGUE_DATA: LeagueData = {
  config: {
    leagueName: "Winter Golf League",
    scoringFormat: "stableford",
    numberOfWeeks: 4,
    bestScoresCount: 5,
    doublePointsLastWeek: true,
  },
  teams: [],
  weeks: [],
};
