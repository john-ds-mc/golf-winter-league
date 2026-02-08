import { LeagueData, DEFAULT_LEAGUE_DATA } from "./types";

const KV_KEY = "league-data";

// In-memory fallback for local dev (server-side)
let memoryStore: LeagueData | null = null;

function findRestCredentials(): { url: string; token: string } | null {
  // Check common env var patterns for Upstash REST credentials
  // Vercel Marketplace lets users set a custom prefix (e.g. GOLF_DB)
  const pairs = [
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.GOLF_DB_KV_REST_API_URL, process.env.GOLF_DB_KV_REST_API_TOKEN],
  ];

  for (const [url, token] of pairs) {
    if (url && token) return { url, token };
  }

  return null;
}

async function getRedisClient() {
  try {
    const creds = findRestCredentials();
    if (creds) {
      const { Redis } = await import("@upstash/redis");
      return new Redis(creds);
    }
  } catch (e) {
    console.error("Failed to create Redis client:", e);
  }
  return null;
}

export async function getLeagueData(): Promise<LeagueData> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      const data = await redis.get<LeagueData>(KV_KEY);
      return data ?? DEFAULT_LEAGUE_DATA;
    }
  } catch (e) {
    console.error("Failed to read from Redis:", e);
  }
  return memoryStore ?? DEFAULT_LEAGUE_DATA;
}

export async function setLeagueData(data: LeagueData): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(KV_KEY, data);
      return;
    }
  } catch (e) {
    console.error("Failed to write to Redis:", e);
  }
  memoryStore = data;
}
