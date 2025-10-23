import { NextResponse } from "next/server";
import { getDB } from "../../db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const db = getDB();
  const ok = db.signup(email, password);
  if (!ok) return NextResponse.json({ error: "Email exists" }, { status: 409 });
  return NextResponse.json({ created: true });
}
