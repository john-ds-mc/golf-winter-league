import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_USERNAME = process.env.AUTH_USERNAME ?? "admin";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "golf";
const SESSION_NAME = "session";

async function makeToken(username: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${username}:${password}:golf-league-salt`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await makeToken(username, password);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_NAME);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_NAME)?.value;
  const expected = await makeToken(AUTH_USERNAME, AUTH_PASSWORD);

  if (token === expected) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
