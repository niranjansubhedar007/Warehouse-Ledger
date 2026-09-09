"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupActionState } from "./actions";
import { Lock } from "@/components/icons";
import { Field } from "@/components/ui";

const initialState: SignupActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="login-shell">
      <form action={formAction} className="login-card">
        <div className="login-brand">
          <Lock size={18} color="var(--blue)" /> Warehouse Ledger
        </div>
        <p className="login-sub">
          Create an account. New accounts start as <b>Staff</b> — promote to Admin from the
          Supabase dashboard&apos;s <code>profiles</code> table.
        </p>

        {state?.error && <div className="login-error">{state.error}</div>}
        {state?.success && (
          <div className="login-error" style={{ color: "var(--green)", background: "var(--green-bg)" }}>
            Account created. If email confirmation is on for your Supabase project, confirm your
            email first, then <Link href="/login" style={{ color: "var(--blue)" }}>sign in</Link>.
          </div>
        )}

        <Field label="Display Name">
          <input name="username" autoComplete="nickname" className="input" placeholder="Your name" />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Email">
          <input type="email" name="email" required autoComplete="email" className="input" placeholder="you@company.com" />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="Password">
          <input type="password" name="password" required autoComplete="new-password" className="input" placeholder="At least 6 characters" />
        </Field>

        <div style={{ marginTop: 18 }}>
          <button type="submit" disabled={pending} className="btn-primary full">
            {pending ? "Creating account…" : "Create Account"}
          </button>
        </div>
        <p className="login-hint">
          Already have an account? <Link href="/login" style={{ color: "var(--blue)" }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
