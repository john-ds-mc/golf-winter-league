import { LeagueData, DEFAULT_LEAGUE_DATA } from "./types";

const KV_KEY = "league-data";

// In-memory fallback for local dev (server-side)
let memoryStore: LeagueData | null = null;

async function getRedisClient() {
  try {
    const { Redis } = await import("@upstash/redis");

    // 1. Explicit URL + token (manual setup or old Vercel KV)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      return new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    }

    // 2. Upstash env vars (Vercel Marketplace sets these)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return Redis.fromEnv();
    }

    // 3. REDIS_URL as REST URL (some integrations use https:// REST URLs here)
    if (process.env.REDIS_URL?.startsWith("https://")) {
      // Try to use REDIS_URL as the REST endpoint -- needs a token too
      const token = process.env.REDIS_TOKEN || process.env.REDIS_REST_TOKEN;
      if (token) {
        return new Redis({ url: process.env.REDIS_URL, token });
      }
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
