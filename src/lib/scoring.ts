import { LeagueData, LeagueConfig, WeekScore } from "./types";

export interface TeamWeekResult {
  teamId: string;
  teamName: string;
  allScores: { playerId: string; playerName: string; score: number | null; counting: boolean }[];
  countingTotal: number;
}

export interface WeekLeagueResult {
  teamId: string;
  teamName: string;
  scoreTotal: number;
  rank: number;
  leaguePoints: number;
  adjustedLeaguePoints: number; // after double-points multiplier
}

export interface StandingsRow {
  rank: number;
  teamId: string;
  teamName: string;
  weeklyTotals: (number | null)[]; // league points per week (null = no scores)
  overallTotal: number;
}

/**
 * Get the best N scores for a team in a given week.
 * For Stableford: higher is better, so sort descending.
 * For Stroke Play: lower is better, so sort ascending.
 */
export function getTeamWeekResult(
  leagueData: LeagueData,
  weekNumber: number
): TeamWeekResult[] {
  const { config, teams, weeks } = leagueData;
  const week = weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return [];

  const isStableford = config.scoringFormat === "stableford";

  return teams.map((team) => {
    const teamScores = week.scores.filter((s) => s.teamId === team.id);

    // Map scores with player info
    const allScores = team.players.map((player) => {
      const scoreEntry = teamScores.find((s) => s.playerId === player.id);
      return {
        playerId: player.id,
        playerName: player.name,
        score: scoreEntry?.score ?? null,
        counting: false,
      };
    });

    // Get valid (non-null) scores and sort
    // Stableford: highest first (descending) — higher points = better
    // Stroke play: lowest first (ascending) — fewer strokes = better
    const validScores = allScores
      .filter((s) => s.score !== null)
      .sort((a, b) =>
        isStableford ? b.score! - a.score! : a.score! - b.score!
      );

    // Mark the best N as counting
    const countingIds = new Set(
      validScores.slice(0, config.bestScoresCount).map((s) => s.playerId)
    );
    allScores.forEach((s) => {
      s.counting = countingIds.has(s.playerId);
    });

    const countingTotal = validScores
      .slice(0, config.bestScoresCount)
      .reduce((sum, s) => sum + s.score!, 0);

    return {
      teamId: team.id,
      teamName: team.name,
      allScores,
      countingTotal,
    };
  });
}

/**
 * Generate default league points for N teams.
 * 1st = 2*(N-1), 2nd = 2*(N-2), ..., last = 1
 */
export function generateDefaultLeaguePoints(numTeams: number): number[] {
  if (numTeams <= 0) return [];
  return Array.from({ length: numTeams }, (_, i) => {
    const rank = i + 1;
    return Math.max(1, 2 * (numTeams - rank));
  });
}

/**
 * Get the league points array to use — from config if valid, otherwise defaults.
 */
function resolveLeaguePoints(config: LeagueConfig, numTeams: number): number[] {
  if (config.leaguePoints && config.leaguePoints.length >= numTeams) {
    return config.leaguePoints;
  }
  return generateDefaultLeaguePoints(numTeams);
}

/**
 * Rank teams for a given week and award league points.
 */
export function getWeekLeaguePoints(
  leagueData: LeagueData,
  weekNumber: number
): WeekLeagueResult[] {
  const teamResults = getTeamWeekResult(leagueData, weekNumber);
  const teamsWithScores = teamResults.filter((r) =>
    r.allScores.some((s) => s.score !== null)
  );
  if (teamsWithScores.length === 0) return [];

  const { config } = leagueData;
  const isStableford = config.scoringFormat === "stableford";
  const isLastWeek = weekNumber === config.numberOfWeeks;
  const multiplier = isLastWeek && config.doublePointsLastWeek ? 2 : 1;
  const N = teamsWithScores.length;
  const pointsTable = resolveLeaguePoints(config, N);

  // Sort by counting total
  const sorted = [...teamsWithScores].sort((a, b) =>
    isStableford ? b.countingTotal - a.countingTotal : a.countingTotal - b.countingTotal
  );

  const results: WeekLeagueResult[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    let rank = i + 1;
    if (i > 0 && sorted[i].countingTotal === sorted[i - 1].countingTotal) {
      rank = results[i - 1].rank;
    }
    const lp = pointsTable[rank - 1] ?? 1;
    results.push({
      teamId: r.teamId,
      teamName: r.teamName,
      scoreTotal: r.countingTotal,
      rank,
      leaguePoints: lp,
      adjustedLeaguePoints: lp * multiplier,
    });
  }

  return results;
}

/**
 * Calculate overall standings across all weeks using league points.
 */
export function getStandings(leagueData: LeagueData): StandingsRow[] {
  const { config, teams } = leagueData;

  const rows: StandingsRow[] = teams.map((team) => {
    const weeklyTotals: (number | null)[] = [];

    for (let w = 1; w <= config.numberOfWeeks; w++) {
      const weekLP = getWeekLeaguePoints(leagueData, w);
      const teamLP = weekLP.find((r) => r.teamId === team.id);
      if (teamLP) {
        weeklyTotals.push(teamLP.adjustedLeaguePoints);
      } else {
        weeklyTotals.push(null);
      }
    }

    const overallTotal = weeklyTotals.reduce(
      (sum: number, t) => sum + (t ?? 0),
      0
    );

    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      weeklyTotals,
      overallTotal,
    };
  });

  // League points: highest total is always best
  rows.sort((a, b) => b.overallTotal - a.overallTotal);

  rows.forEach((row, i) => {
    if (i > 0 && row.overallTotal === rows[i - 1].overallTotal) {
      row.rank = rows[i - 1].rank;
    } else {
      row.rank = i + 1;
    }
  });

  return rows;
}

/**
 * Check if a week has any scores entered.
 */
export function isWeekComplete(leagueData: LeagueData, weekNumber: number): boolean {
  const week = leagueData.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return false;
  return week.scores.some((s) => s.score !== null);
}

/**
 * Get count of scores entered for a week.
 */
export function getWeekScoreCount(leagueData: LeagueData, weekNumber: number): number {
  const week = leagueData.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return 0;
  return week.scores.filter((s) => s.score !== null).length;
}

/**
 * Get total number of players across all teams.
 */
export function getTotalPlayerCount(leagueData: LeagueData): number {
  return leagueData.teams.reduce((sum, team) => sum + team.players.length, 0);
}
