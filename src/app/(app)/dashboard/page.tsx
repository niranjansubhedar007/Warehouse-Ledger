import { createClient } from "@/lib/supabase/server";
import { RestrictedNotice } from "@/components/RestrictedNotice";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (profile?.role !== "admin") return <RestrictedNotice />;

  return <DashboardClient />;
}
