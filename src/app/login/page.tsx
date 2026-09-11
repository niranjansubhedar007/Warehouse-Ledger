"use client";
import { Suspense, useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type AuthActionState } from "./actions";
import { Eye, EyeOff, Lock } from "@/components/icons";
import { Field, Modal } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

const initialState: AuthActionState = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordVisible, setRecoveryPasswordVisible] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [loginRole, setLoginRole] = useState<"staff" | "admin">("admin");
  const showToast = useToast();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    if (!state?.error) return;
    showToast(state.error, "error");
  }, [state?.error, showToast]);
  const recoveryStrength = recoveryPassword.length >= 8 && /[A-Za-z]/.test(recoveryPassword) && /\d/.test(recoveryPassword) ? "medium" : "low";
  const resetPassword = async () => {
    if (!recoveryUsername || !recoveryEmail || !recoveryPhone || recoveryStrength === "low") {
      showToast("Enter all details and a password with at least 8 characters, letters, and numbers.", "warning");
      return;
    }
    setRecoveryPending(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("reset_profile_password", {
      p_username: recoveryUsername.trim(), p_email: recoveryEmail.trim().toLowerCase(),
      p_phone_number: recoveryPhone.trim(), p_new_password: recoveryPassword,
    });
    setRecoveryPending(false);
    showToast(error ? error.message : "Password reset successfully. You can now sign in.", error ? "error" : "success");
    if (!error) setRecoveryPassword("");
  };

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

      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="role" value={loginRole} />

      <div className="login-role-tabs" role="tablist" aria-label="Login type">
        <button
          type="button"
          role="tab"
          aria-selected={loginRole === "admin"}
          className={loginRole === "admin" ? "active" : ""}
          onClick={() => setLoginRole("admin")}
        >
          Admin Login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={loginRole === "staff"}
          className={loginRole === "staff" ? "active" : ""}
          onClick={() => setLoginRole("staff")}
        >
          Staff Login
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
      <button type="button" className="login-forgot" onClick={() => setShowRecovery(true)}>
        Forgot password?
      </button>
      {showRecovery && (
        <Modal title="Reset Password" onClose={() => setShowRecovery(false)} className="login-recovery-modal">
          <div className="login-recovery-form">
            <p className="login-recovery-text">Verify your username, email, and phone number to choose a new password.</p>
            <Field label="Username"><input className="input" value={recoveryUsername} onChange={(e) => setRecoveryUsername(e.target.value)} autoComplete="off" /></Field>
            <Field label="Email"><input className="input" type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} autoComplete="off" /></Field>
            <Field label="Phone Number"><input className="input" maxLength={10} type="tel" value={recoveryPhone} onChange={(e) => setRecoveryPhone(e.target.value)} autoComplete="off" /></Field>
            <Field label="New Password">
              <div className="password-input-wrap">
                <input className="input password-input" type={recoveryPasswordVisible ? "text" : "password"} value={recoveryPassword} onChange={(e) => setRecoveryPassword(e.target.value)} autoComplete="off" />
                <button type="button" className="password-toggle icon-btn" onClick={() => setRecoveryPasswordVisible((visible) => !visible)} aria-label={recoveryPasswordVisible ? "Hide password" : "Show password"}>
                  {recoveryPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <button type="button" className="btn-primary full" disabled={recoveryPending || recoveryStrength === "low"} onClick={resetPassword}>{recoveryPending ? "Resetting..." : "Reset Password"}</button>
          </div>
        </Modal>
      )}
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
