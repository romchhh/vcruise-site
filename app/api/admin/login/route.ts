import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  authenticateUser,
  createSession,
  destroySession,
  getRequestSession,
} from "@/lib/cms/session";
import { readDb } from "@/lib/cms/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    login?: string;
    password?: string;
    remember?: boolean;
  } | null;

  const login = body?.login?.trim() ?? "";
  const password = body?.password ?? "";
  const remember = Boolean(body?.remember);

  if (!login || !password) {
    return NextResponse.json(
      { ok: false, error: "missing_credentials" },
      { status: 400 }
    );
  }

  const user = authenticateUser(login, password);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );
  }

  const db = readDb();
  const role = db.roles.find((entry) => entry.id === user.roleId);
  const { token, maxAge } = createSession(
    user.id,
    user.login,
    user.roleId,
    remember
  );

  const response = NextResponse.json({
    ok: true,
    login: user.login,
    name: user.name,
    roleId: user.roleId,
    permissions: role?.permissions ?? [],
  });

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  return response;
}

export async function DELETE() {
  const session = await getRequestSession();
  destroySession(session?.token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, authenticated: false },
      { status: 401 }
    );
  }

  const db = readDb();
  const user = db.users.find((entry) => entry.id === session.userId);
  const role = db.roles.find((entry) => entry.id === session.roleId);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    login: session.login,
    name: user?.name ?? session.login,
    roleId: session.roleId,
    permissions: role?.permissions ?? [],
  });
}
