import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Accept and ack; client advances locally for demo
  return NextResponse.json({ next: "continue", received: true });
}
