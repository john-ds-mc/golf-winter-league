import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLeagueData, setLeagueData } from "@/lib/kv";
import { LeagueData } from "@/lib/types";

async function isAuthenticated(): Promise<boolean> {
  const accounts = [
    {
      username: process.env.AUTH_USERNAME ?? "admin",
      password: process.env.AUTH_PASSWORD ?? "golf",
    },
    ...(process.env.AUTH_USERNAME_2
      ? [{ username: process.env.AUTH_USERNAME_2, password: process.env.AUTH_PASSWORD_2 ?? "" }]
      : []),
  ];

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return false;

  for (const account of accounts) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${account.username}:${account.password}:golf-league-salt`);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const expected = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (token === expected) return true;
  }
  return false;
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
