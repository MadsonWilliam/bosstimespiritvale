import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Container healthcheck: the app is only healthy if SQLite answers. */
export async function GET() {
  try {
    db().prepare("SELECT 1").get();
    return NextResponse.json({ ok: true, at: Date.now() });
  } catch (err) {
    console.error("healthcheck", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
