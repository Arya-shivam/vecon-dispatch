import { redirect } from "next/navigation";
import { demoMode } from "./config";
import { today } from "./domain";
import type { Role } from "./roles";
import { auth } from "./auth/server";
export type { Role };

function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function roleForEmail(email: string | null | undefined): Role {
  if (!email) return "viewer";
  return adminEmails().includes(email.toLowerCase()) ? "admin" : "viewer";
}

/** Kept for unit tests / migration notes; login uses Neon Auth. */
export function roleForPassword(
  password: string,
  admin = process.env.APP_PASSWORD,
  viewer = process.env.VIEWER_PASSWORD,
): Role | null {
  if (admin && password === admin) return "admin";
  if (viewer && password === viewer) return "viewer";
  return null;
}

export async function getSession(): Promise<{
  role: Role;
  email?: string;
  name?: string;
} | null> {
  if (demoMode) return { role: "admin", email: "demo@local", name: "Demo" };
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.email) return null;
  return {
    role: roleForEmail(user.email),
    email: user.email,
    name: user.name || undefined,
  };
}

/** Guest viewers are allowed without login. */
export async function getAccess(): Promise<{
  role: Role;
  email?: string;
  name?: string;
  guest: boolean;
}> {
  const session = await getSession();
  if (session) return { ...session, guest: false };
  return { role: "viewer", guest: true };
}

export async function authenticated() {
  return !!(await getSession());
}

export async function requireAuth() {
  if (!(await getSession())) redirect("/login");
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/d/" + today());
}

export async function clearSession() {
  if (demoMode) return;
  await auth.signOut();
}
