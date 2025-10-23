import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId");

  const url = new URL("/leaderboard", API_BASE);
  if (weekId) url.searchParams.set("weekId", weekId);

  const res = await fetch(url.toString(), {
    // Forward minimal headers if needed
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
