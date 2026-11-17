import { getSessionProfile } from "@/lib/auth";
import { SalesClient } from "./SalesClient";

export default async function SalesPage() {
  const user = await getSessionProfile();
  return <SalesClient isAdmin={user?.role === "admin"} />;
}
