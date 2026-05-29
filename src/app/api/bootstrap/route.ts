import { NextResponse } from "next/server";
import { getScheduleSnapshot } from "@/lib/scheduling/snapshot";

export async function GET() {
  return NextResponse.json(await getScheduleSnapshot());
}
