import { createClient } from "@/lib/supabase/server";
import { RestrictedNotice } from "@/components/RestrictedNotice";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (profile?.role !== "admin") return <RestrictedNotice />;

  return <ReportsClient />;
}
