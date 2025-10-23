import { NextResponse } from "next/server";
import { getDB } from "../../db";
import { getSessionToken } from "../../_utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const token = getSessionToken();
  const db = getDB();
  if (!token || !db.userIdFromSession(token)) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  db.saveScore(token, payload.quizId, payload.correct ?? 0, payload.total ?? 0);
  return NextResponse.json({ saved: true });
}
