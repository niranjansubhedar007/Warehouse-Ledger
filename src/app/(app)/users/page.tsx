import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { RestrictedNotice } from "@/components/RestrictedNotice";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const supabase = await createClient();
  const user = await getSessionProfile();
  if (!user) return <RestrictedNotice />;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return <RestrictedNotice />;

  const { data: history } = await supabase
    .from("profiles")
    .select("id, username, role, created_at, created_by_username")
    .order("created_at", { ascending: false });

  return <UsersClient history={history || []} />;
}
