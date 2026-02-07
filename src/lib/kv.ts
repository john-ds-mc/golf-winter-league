import { LeagueData, DEFAULT_LEAGUE_DATA } from "./types";

const KV_KEY = "league-data";

/**
 * Server-side: use Upstash Redis if available, otherwise fall back to in-memory store.
 * Client-side: use localStorage.
 */

// In-memory fallback for local dev (server-side)
let memoryStore: LeagueData | null = null;

async function getRedisClient() {
  // Support both Vercel Marketplace (REDIS_URL) and manual Upstash (KV_REST_API_URL/TOKEN)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { Redis } = await import("@upstash/redis");
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  if (process.env.REDIS_URL) {
    const { Redis } = await import("@upstash/redis");
    return Redis.fromEnv();
  }
  return null;
}

export async function getLeagueData(): Promise<LeagueData> {
  const redis = await getRedisClient();
  if (redis) {
    const data = await redis.get<LeagueData>(KV_KEY);
    return data ?? DEFAULT_LEAGUE_DATA;
  }
  // Fallback: in-memory store for local dev
  return memoryStore ?? DEFAULT_LEAGUE_DATA;
}

export async function setLeagueData(data: LeagueData): Promise<void> {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(KV_KEY, data);
    return;
  }
  // Fallback: in-memory store for local dev
  memoryStore = data;
}
