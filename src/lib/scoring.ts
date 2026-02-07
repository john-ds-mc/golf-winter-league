import { LeagueData, WeekScore } from "./types";

export interface TeamWeekResult {
  teamId: string;
  teamName: string;
  allScores: { playerId: string; playerName: string; score: number | null; counting: boolean }[];
  countingTotal: number;
  adjustedTotal: number; // after double-points multiplier
}

export interface StandingsRow {
  rank: number;
  teamId: string;
  teamName: string;
  weeklyTotals: (number | null)[]; // null = no scores entered
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
  const isLastWeek = weekNumber === config.numberOfWeeks;
  const multiplier = isLastWeek && config.doublePointsLastWeek ? 2 : 1;

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
    const validScores = allScores
      .filter((s) => s.score !== null)
      .sort((a, b) => {
        if (isStableford) return b.score! - a.score!; // descending
        return a.score! - b.score!; // ascending
      });

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
      adjustedTotal: countingTotal * multiplier,
    };
  });
}

/**
 * Calculate overall standings across all weeks.
 */
export function getStandings(leagueData: LeagueData): StandingsRow[] {
  const { config, teams } = leagueData;
  const isStableford = config.scoringFormat === "stableford";

  const rows: StandingsRow[] = teams.map((team) => {
    const weeklyTotals: (number | null)[] = [];

    for (let w = 1; w <= config.numberOfWeeks; w++) {
      const weekResults = getTeamWeekResult(leagueData, w);
      const teamResult = weekResults.find((r) => r.teamId === team.id);
      if (teamResult && teamResult.allScores.some((s) => s.score !== null)) {
        weeklyTotals.push(teamResult.adjustedTotal);
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

  // Sort: Stableford = highest total first, Stroke Play = lowest total first
  rows.sort((a, b) => {
    if (isStableford) return b.overallTotal - a.overallTotal;
    return a.overallTotal - b.overallTotal;
  });

  // Assign ranks
  rows.forEach((row, i) => {
    row.rank = i + 1;
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
