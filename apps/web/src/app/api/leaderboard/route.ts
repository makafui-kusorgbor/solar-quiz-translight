import { NextResponse } from "next/server";
import { getDB } from "../../db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const db = getDB();
  const rows = db.getLeaderboard();
  return NextResponse.json({ weekId: db.weekId(), globalBoard: rows, friendsBoard: rows });
}
