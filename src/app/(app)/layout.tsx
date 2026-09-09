import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as "admin" | "staff") || "staff";
  const username = profile?.username || user.email?.split("@")[0] || "user";

  const { data: items } = await supabase
    .from("items")
    .select("current_stock, low_stock_threshold");
  const lowCount = (items || []).filter((i) => i.current_stock < i.low_stock_threshold).length;

  return (
    <AppShell role={role} username={username} lowCount={lowCount}>
      {children}
    </AppShell>
  );
}
