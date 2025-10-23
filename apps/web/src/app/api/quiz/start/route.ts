import { NextResponse } from "next/server";
import { getDB } from "../../../db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const db = getDB();
  const data = db.quizStart();
  return NextResponse.json(data);
}
