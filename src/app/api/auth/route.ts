import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_ACCOUNTS = [
  {
    username: process.env.AUTH_USERNAME ?? "admin",
    password: process.env.AUTH_PASSWORD ?? "golf",
  },
  ...(process.env.AUTH_USERNAME_2
    ? [{ username: process.env.AUTH_USERNAME_2, password: process.env.AUTH_PASSWORD_2 ?? "" }]
    : []),
];

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

  const account = ADMIN_ACCOUNTS.find(
    (a) => a.username === username && a.password === password
  );

  if (!account) {
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
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  for (const account of ADMIN_ACCOUNTS) {
    const expected = await makeToken(account.username, account.password);
    if (token === expected) {
      return NextResponse.json({ authenticated: true });
    }
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}
