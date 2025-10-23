import { NextResponse } from "next/server";
import { getDB } from "../../../../db";

type Params = { params: { quizId: string; section: string } };
export const runtime = "nodejs";

export async function POST(req: Request, ctx: Params) {
  const { quizId, section } = ctx.params;
  const payload = await req.json().catch(() => ({}));
  const db = getDB();
  const data = db.sectionQuestions(quizId, section, payload);
  return NextResponse.json(data);
}
