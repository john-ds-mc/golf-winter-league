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
 * Extract the counting scores for a team, sorted from best to worst.
 * Stableford: descending (highest first). Stroke play: ascending (lowest first).
 */
function getCountingScores(result: TeamWeekResult, isStableford: boolean): number[] {
  return result.allScores
    .filter((s) => s.counting && s.score !== null)
    .map((s) => s.score!)
    .sort((a, b) => (isStableford ? b - a : a - b));
}

/**
 * Compare two teams by tiebreaker: compare counting cards from worst (Nth)
 * back to best (1st). Returns negative if a is better, positive if b is better, 0 if tied.
 */
function compareTiebreak(a: number[], b: number[], isStableford: boolean): number {
  const len = Math.max(a.length, b.length);
  // Compare from worst counting card (last) to best (first)
  for (let i = len - 1; i >= 0; i--) {
    const aVal = a[i] ?? (isStableford ? -Infinity : Infinity);
    const bVal = b[i] ?? (isStableford ? -Infinity : Infinity);
    if (aVal !== bVal) {
      return isStableford ? bVal - aVal : aVal - bVal;
    }
  }
  return 0;
}

/**
 * Rank teams for a given week and award league points.
 * Tiebreaker: compare counting cards from worst to best.
 * If still tied after all cards, average points across tied positions.
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

  // Build counting scores for tiebreaker comparison
  const withCounting = teamsWithScores.map((r) => ({
    ...r,
    countingScores: getCountingScores(r, isStableford),
  }));

  // Sort by counting total, then tiebreak on individual cards
  const sorted = withCounting.sort((a, b) => {
    const totalDiff = isStableford
      ? b.countingTotal - a.countingTotal
      : a.countingTotal - b.countingTotal;
    if (totalDiff !== 0) return totalDiff;
    return compareTiebreak(a.countingScores, b.countingScores, isStableford);
  });

  // Identify groups of truly tied teams (same total AND same individual cards)
  // and average their league points
  const results: WeekLeagueResult[] = [];
  let i = 0;
  while (i < sorted.length) {
    // Find the end of this tie group
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].countingTotal === sorted[i].countingTotal &&
      compareTiebreak(sorted[j].countingScores, sorted[i].countingScores, isStableford) === 0
    ) {
      j++;
    }

    const tieSize = j - i;
    const rank = i + 1;

    // Average the league points across the tied positions
    let totalPoints = 0;
    for (let k = 0; k < tieSize; k++) {
      totalPoints += pointsTable[i + k] ?? 1;
    }
    const avgPoints = totalPoints / tieSize;

    for (let k = i; k < j; k++) {
      const r = sorted[k];
      results.push({
        teamId: r.teamId,
        teamName: r.teamName,
        scoreTotal: r.countingTotal,
        rank,
        leaguePoints: avgPoints,
        adjustedLeaguePoints: avgPoints * multiplier,
      });
    }

    i = j;
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
