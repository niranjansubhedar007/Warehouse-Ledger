import { cookies } from "next/headers";

export const SESSION_COOKIE = "warehouse_profile";

export type SessionProfile = {
  id: string | number;
  username: string;
  role: "admin" | "staff";
  is_dark_mode: boolean;
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;

  try {
    return JSON.parse(value) as SessionProfile;
  } catch {
    return null;
  }
}