"use server";
import { createClient } from "@/lib/supabase/server";

export interface SignupActionState {
  error?: string;
  success?: boolean;
}

export async function signup(_prevState: SignupActionState | undefined, formData: FormData): Promise<SignupActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const username = String(formData.get("username") || "").trim();

  if (!email || !password) {
    return { error: "Enter an email and password." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username || undefined } },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
