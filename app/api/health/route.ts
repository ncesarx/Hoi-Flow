import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "xeroflow",
    status: "ok",
    sprint: "S1.1-S1.4",
    timestamp: new Date().toISOString(),
  });
}
