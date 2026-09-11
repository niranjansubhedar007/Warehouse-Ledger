import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getSessionProfile();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, is_dark_mode")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role as "admin" | "staff";
  const username = profile?.username || user.username || "user";
  const isDarkMode = profile?.is_dark_mode ?? user.is_dark_mode;

  const { data: items } = await supabase
    .from("items")
    .select("current_stock, low_stock_threshold");
  const lowCount = (items || []).filter((i) => i.current_stock < i.low_stock_threshold).length;

  return (
    <AppShell profileId={user.id} isDarkMode={isDarkMode} role={role} username={username} lowCount={lowCount}>
      {children}
    </AppShell>
  );
}
