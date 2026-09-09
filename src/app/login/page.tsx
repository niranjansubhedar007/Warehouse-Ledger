"use client";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type AuthActionState } from "./actions";
import { Lock } from "@/components/icons";
import { Field } from "@/components/ui";

const initialState: AuthActionState = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  return (
    <form action={formAction} className="login-card">
      <div className="login-brand">
        <Lock size={18} color="var(--blue)" /> Warehouse Ledger
      </div>
      <p className="login-sub">Sign in with your Supabase account to continue.</p>

      {state?.error && <div className="login-error">{state.error}</div>}

      <input type="hidden" name="next" value={next} />

      <Field label="Username">
        <input type="text" name="username" required autoComplete="username" className="input" placeholder="yourusername" />
      </Field>
      <div style={{ height: 12 }} />
      <Field label="Password">
        <input type="password" name="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </Field>

      <div style={{ marginTop: 18 }}>
        <button type="submit" disabled={pending} className="btn-primary full">
          {pending ? "Signing in…" : "Log In"}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-shell">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
