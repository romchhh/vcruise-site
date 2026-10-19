import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/session";
import {
  getSyncStatus,
  startCruiseSync,
  stopCruiseSync,
} from "@/lib/cms/sync";
import { readDb } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = getSyncStatus();
  const runs = readDb().syncRuns;

  return NextResponse.json({
    ok: true,
    status,
    runs,
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    limit?: number;
    mode?: "full" | "quick";
  } | null;

  const limit =
    body?.mode === "quick"
      ? 300
      : typeof body?.limit === "number"
        ? body.limit
        : undefined;

  const result = startCruiseSync("admin", { limit });
  if (!result.ok) {
    const status = result.error === "already_running" ? 409 : 500;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        pid: "pid" in result ? result.pid : undefined,
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    run: result.run,
    pid: result.pid,
    logFile: result.logFile,
    limit: result.limit,
    status: getSyncStatus(),
  });
}

export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return error;

  const result = stopCruiseSync();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === "not_running" ? 409 : 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    pid: result.pid,
    status: getSyncStatus(),
  });
}
