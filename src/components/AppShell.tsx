"use client";
import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ToastProvider } from "@/components/ToastProvider";
import { Modal } from "@/components/ui";
import { logout } from "@/app/login/actions";

export function AppShell({
  role,
  username,
  lowCount,
  profileId,
  isDarkMode,
  children,
}: {
  profileId: string | number;
  isDarkMode: boolean;
  role: "admin" | "staff";
  username: string;
  lowCount: number;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigate = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches) {
      setSidebarOpen(false);
    }
  };

  return (
    <ToastProvider>
      <div className={`shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <Sidebar
          role={role}
          lowCount={lowCount}
          onLogout={() => setShowLogoutConfirm(true)}
          onClose={() => setSidebarOpen(false)}
          onNavigate={handleNavigate}
        />
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        <main className="main">
          <TopBar
            profileId={profileId}
            isDarkMode={isDarkMode}
            username={username}
            role={role}
            lowCount={lowCount}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
          />
          <div className="content">{children}</div>
        </main>
      </div>
      {showLogoutConfirm && (
        <Modal title="Confirm Logout" onClose={() => setShowLogoutConfirm(false)}>
          <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>
            Are you sure you want to log out?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </Modal>
      )}
    </ToastProvider>
  );
}
