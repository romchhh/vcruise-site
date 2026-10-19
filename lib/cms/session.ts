import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deleteAdminSession,
  loadAdminSession,
  purgeExpiredAdminSessions,
  readDb,
  saveAdminSession,
  uid,
  type AdminSessionRecord,
} from "./store";

export const ADMIN_COOKIE = "vcruise_admin_session";

export type SessionRecord = AdminSessionRecord;

export function createSession(
  userId: string,
  login: string,
  roleId: string,
  remember: boolean
) {
  // Persist in SQLite so deploys / container restarts keep admin logged in.
  purgeExpiredAdminSessions();

  const token = uid("sess");
  const ttlMs = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 7;
  const record: SessionRecord = {
    token,
    userId,
    login,
    roleId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
  saveAdminSession(record);
  return { token, maxAge: Math.floor(ttlMs / 1000), record };
}

export function destroySession(token: string | undefined) {
  deleteAdminSession(token);
}

export function getSessionFromToken(token: string | undefined) {
  if (!token) return null;
  const record = loadAdminSession(token);
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    deleteAdminSession(token);
    return null;
  }
  return record;
}

export async function getRequestSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return getSessionFromToken(token);
}

export async function requireAdmin() {
  const session = await getRequestSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { session, error: null };
}

export function authenticateUser(login: string, password: string) {
  const db = readDb();
  const user = db.users.find(
    (entry) => entry.active && entry.login === login.trim()
  );
  if (!user) return null;

  if (user.password === password) return user;

  // Env override for the seeded owner account (useful after password change in .env)
  const envLogin = process.env.ADMIN_LOGIN || "admin";
  const envPassword = process.env.ADMIN_PASSWORD;
  if (
    envPassword &&
    user.login === envLogin &&
    password === envPassword
  ) {
    return user;
  }

  return null;
}
