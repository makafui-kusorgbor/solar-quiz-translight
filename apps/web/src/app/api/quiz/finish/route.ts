import { NextResponse } from "next/server";
import { withSessionHeaders } from "../../_utils";

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export async function POST(req: Request) {
  const url = new URL("/quiz/finish", API_BASE).toString();
  const res = await fetch(url, { method: "POST", body: await req.text(), headers: withSessionHeaders(req), cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
