import { NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

export async function POST(req: Request) {
  const url = new URL("/auth/signup", API_BASE).toString();
  const res = await fetch(url, { method: "POST", body: await req.text(), headers: { "content-type": "application/json" }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
