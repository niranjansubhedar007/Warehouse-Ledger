"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, type SessionProfile } from "@/lib/auth";

export interface AuthActionState {
  error?: string;
}

export async function login(_prevState: AuthActionState | undefined, formData: FormData): Promise<AuthActionState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff");
  const next = String(formData.get("next") || "/");

  if (!username || !password || (role !== "staff" && role !== "admin")) {
    return { error: "Enter your username and password." };
  }

  const supabase = await createClient();

  const { data: profile, error: lookupError } = await supabase.rpc("verify_profile_password", {
    p_username: username,
    p_password: password,
  });

  const profileRow = Array.isArray(profile) ? profile[0] : profile;

  if (lookupError) {
    console.error("Profile login lookup failed:", lookupError.message);
    return { error: "Login setup error. Check that the custom-auth SQL was run in Supabase." };
  }

  if (!profileRow) {
    return { error: "Invalid username or password. Check that this username exists in profiles." };
  }

  if (profileRow.role !== role) {
    return { error: `This account is registered as ${profileRow.role}. Select the correct login tab.` };
  }

  const session: SessionProfile = {
    id: profileRow.id,
    username: profileRow.username,
    role: profileRow.role,
    is_dark_mode: profileRow.is_dark_mode ?? false,
  };
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  redirect(next || "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
