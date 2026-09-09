"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ToastProvider } from "@/components/ToastProvider";
import { createClient } from "@/lib/supabase/client";

export function AppShell({
  role,
  username,
  lowCount,
  children,
}: {
  role: "admin" | "staff";
  username: string;
  lowCount: number;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
          onClose={() => setSidebarOpen(false)}
          onNavigate={handleNavigate}
        />
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        <main className="main">
          <TopBar
            username={username}
            role={role}
            lowCount={lowCount}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onLogout={handleLogout}
          />
          <div className="content">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
