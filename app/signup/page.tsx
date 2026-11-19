"use client";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { today } from "@/lib/domain";
import { signUpWithEmail } from "../login/actions";

export default function SignUp() {
  const [state, action, pending] = useActionState(signUpWithEmail, null);
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
      <h1>Create account</h1>
      <p>
        Optional. You can view jobs without an account. Admin access is granted
        by email allow-list.
      </p>
      <form action={action}>
        <label>
          Name
          <input name="name" type="text" required autoComplete="name" />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="you@company.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {state?.error && (
          <p role="alert" className="error">
            {state.error}
          </p>
        )}
        <button className="primary" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <Link className="secondary skip-link" href={"/d/" + today()}>
        Skip · view jobs without signing in
      </Link>
      <p className="muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
