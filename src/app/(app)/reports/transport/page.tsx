import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { RestrictedNotice } from "@/components/RestrictedNotice";
import { ReportsClient } from "../ReportsClient";

export default async function TransportReportPage() {
  const supabase = await createClient();
  const user = await getSessionProfile();
  if (!user) return <RestrictedNotice />;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return <RestrictedNotice />;
  return <ReportsClient report="transport" />;
}
