import { Lock } from "@/components/icons";

export function RestrictedNotice() {
  return (
    <div className="restricted">
      <Lock size={22} color="var(--text-faint)" />
      <div className="restricted-title">Admin access required</div>
      <p className="text-muted" style={{ fontSize: 13 }}>
        This section is only visible to Admin logins.
      </p>
    </div>
  );
}
