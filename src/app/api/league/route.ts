import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLeagueData, setLeagueData } from "@/lib/kv";
import { LeagueData } from "@/lib/types";

async function isAuthenticated(): Promise<boolean> {
  const AUTH_USERNAME = process.env.AUTH_USERNAME ?? "admin";
  const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "golf";
  const encoder = new TextEncoder();
  const data = encoder.encode(`${AUTH_USERNAME}:${AUTH_PASSWORD}:golf-league-salt`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const expected = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const cookieStore = await cookies();
  return cookieStore.get("session")?.value === expected;
}

export async function GET() {
  const data = await getLeagueData();
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as LeagueData;
  await setLeagueData(body);
  return NextResponse.json({ ok: true });
}
