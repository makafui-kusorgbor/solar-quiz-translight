import { NextResponse } from "next/server";
import { getDB } from "../../db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const db = getDB();
  const token = db.login(email, password);
  if (!token) return NextResponse.json({ error: "Invalid" }, { status: 401 });
  const resp = NextResponse.json({ token, email, userId: db.userIdFromSession(token) });
  resp.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return resp;
}
