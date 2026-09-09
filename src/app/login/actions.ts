"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
}

export async function login(_prevState: AuthActionState | undefined, formData: FormData): Promise<AuthActionState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const supabase = await createClient();

  const { data: email, error: lookupError } = await supabase.rpc("email_for_username", {
    p_username: username,
  });

  if (lookupError || !email) {
    return { error: "Invalid username or password." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid username or password." };
  }

  redirect(next || "/");
}
