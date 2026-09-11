"use client";
import { useEffect, useState } from "react";
import { Bell, Menu, Moon, Sun } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

export function TopBar({
  profileId,
  isDarkMode: initialDarkMode,
  username,
  role,
  lowCount,
  onToggleSidebar,
}: {
  profileId: string | number;
  isDarkMode: boolean;
  username: string;
  role: string;
  lowCount: number;
  onToggleSidebar: () => void;
}) {
  const [darkMode, setDarkMode] = useState(initialDarkMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = async () => {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    document.documentElement.setAttribute("data-theme", nextDarkMode ? "dark" : "light");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ is_dark_mode: nextDarkMode }).eq("id", profileId);
    if (error) setDarkMode(!nextDarkMode);
  };

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
        <button
          onClick={toggleTheme}
          className="icon-btn theme-toggle"
          aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
          title={darkMode ? "Switch to light theme" : "Switch to dark theme"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
