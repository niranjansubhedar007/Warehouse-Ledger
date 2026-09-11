"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

export interface CreateUserState {
  error?: string;
  success?: string;
}

export async function createUser(
  _previousState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phoneNumber = String(formData.get("phone_number") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff");

  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return { error: "Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens." };
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (!/^\+?[0-9\s()-]{7,20}$/.test(phoneNumber)) return { error: "Enter a valid phone number." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const isMediumPassword = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  if (!isMediumPassword) return { error: "Password strength is Low. Use at least 8 characters with letters and numbers." };
  if (role !== "admin" && role !== "staff") return { error: "Choose a valid role." };

  const supabase = await createClient();
  const currentUser = await getSessionProfile();

  if (!currentUser) return { error: "You must be signed in." };

  const { error } = await supabase.rpc("create_profile_user", {
    p_username: username,
    p_email: email,
    p_phone_number: phoneNumber,
    p_password: password,
    p_role: role,
    p_created_by: Number(currentUser.id),
    p_created_by_username: currentUser.username,
  });

  if (error) {
    if (error?.message.toLowerCase().includes("already registered")) {
      return { error: "That username already exists." };
    }
    if (error.message.toLowerCase().includes("administrator")) {
      return { error: "Only administrators can create users." };
    }
    return { error: error?.message || "Could not create the user." };
  }

  revalidatePath("/users");
  return { success: `${username} was created as ${role}.` };
}
