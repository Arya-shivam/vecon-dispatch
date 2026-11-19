"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { today } from "@/lib/domain";
import { signInWithEmail } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState(signInWithEmail, null);
  return (
    <main className="login">
      <Image
        src="/vecon-logo.jpg"
        alt="VECON Construction"
        width={320}
        height={64}
        className="brand-logo login-logo"
        priority
      />
      <h1>Admin sign in</h1>
      <p>
        Sign in to manage jobs, trucks, and masters. Viewing daily jobs does
        not require an account.
      </p>
      <form action={action}>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="admin@vecon.asia"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {state?.error && (
          <p role="alert" className="error">
            {state.error}
          </p>
        )}
        <button className="primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Link className="secondary skip-link" href={"/d/" + today()}>
        Skip · view jobs without signing in
      </Link>
      <p className="muted">
        Need an admin account? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
