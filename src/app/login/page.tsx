"use client";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type AuthActionState } from "./actions";
import { Eye, EyeOff, Lock } from "@/components/icons";
import { Field } from "@/components/ui";

const initialState: AuthActionState = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [loginRole, setLoginRole] = useState<"staff" | "admin">("staff");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  return (
    <form action={formAction} className="login-card">
      <div className="login-brand">
        <span className="login-brand-mark"><Lock size={17} /></span>
        <span>Warehouse Ledger</span>
      </div>
      <div className="login-heading">
        <p className="login-eyebrow">WAREHOUSE OPERATIONS</p>
        <h1>Welcome back</h1>
        <p className="login-sub">Sign in to manage your inventory and sales.</p>
      </div>

      {state?.error && <div className="login-error">{state.error}</div>}

      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="role" value={loginRole} />

      <div className="login-role-tabs" role="tablist" aria-label="Login type">
        <button
          type="button"
          role="tab"
          aria-selected={loginRole === "staff"}
          className={loginRole === "staff" ? "active" : ""}
          onClick={() => setLoginRole("staff")}
        >
          Staff Login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={loginRole === "admin"}
          className={loginRole === "admin" ? "active" : ""}
          onClick={() => setLoginRole("admin")}
        >
          Admin Login
        </button>
      </div>

      <Field label="Username">
        <input type="text" name="username" required autoComplete="off" autoCorrect="off" spellCheck={false} className="input" placeholder="yourusername" />
      </Field>
      <div style={{ height: 12 }} />
      <Field label="Password">
        <div className="password-input-wrap">
          <input type={showPassword ? "text" : "password"} name="password" required autoComplete="current-password" className="input password-input" placeholder="••••••••" />
          <button
            type="button"
            className="password-toggle icon-btn"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
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
