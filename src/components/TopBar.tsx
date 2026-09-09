"use client";
import { Bell, LogOut, Menu } from "@/components/icons";

export function TopBar({
  username,
  role,
  lowCount,
  onToggleSidebar,
  onLogout,
}: {
  username: string;
  role: string;
  lowCount: number;
  onToggleSidebar: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onToggleSidebar} className="sidebar-toggle-btn" aria-label="Toggle sidebar" title="Toggle sidebar">
          <Menu size={17} />
        </button>
        <div className="topbar-user">
          Signed in as <b>{username}</b>
          <span style={{ margin: "0 6px" }}>·</span>
          <span style={{ textTransform: "capitalize" }}>{role}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-alert">
          <Bell size={15} /> Low Stock: {lowCount}
        </div>
        <button onClick={onLogout} className="topbar-logout">
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
}
