import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { RestrictedNotice } from "@/components/RestrictedNotice";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getSessionProfile();
  if (!user) return <RestrictedNotice />;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return <RestrictedNotice />;

  return <DashboardClient />;
}
