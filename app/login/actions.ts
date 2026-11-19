"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export async function signInWithEmail(
  _prev: { error: string } | null,
  form: FormData,
) {
  const { error } = await auth.signIn.email({
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
  });
  if (error) return { error: error.message || "Could not sign in." };
  redirect("/");
}

export async function signUpWithEmail(
  _prev: { error: string } | null,
  form: FormData,
) {
  const { error } = await auth.signUp.email({
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
    name: String(form.get("name") || "Dispatcher"),
  });
  if (error) return { error: error.message || "Could not create account." };
  redirect("/");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/login");
}
