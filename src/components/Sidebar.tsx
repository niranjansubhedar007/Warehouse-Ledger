"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Receipt,
  Boxes,
  FileBarChart,
  UserPlus,
  LogOut,
  X,
} from "@/components/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, adminOnly: true },
  { href: "/items", label: "Item Master", icon: Package },
  { href: "/purchase", label: "Purchase", icon: ShoppingCart },
  { href: "/sales", label: "Sales / Billing", icon: Receipt },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/reports", label: "Reports", icon: FileBarChart, adminOnly: true },
  { href: "/users", label: "User Management", icon: UserPlus, adminOnly: true },
];

export function Sidebar({
  role,
  lowCount,
  onLogout,
  onClose,
  onNavigate,
}: {
  role: "admin" | "staff";
  lowCount: number;
  onLogout: () => void;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const nav = NAV.filter((n) => !n.adminOnly || role === "admin");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">WL</div>
        <div>
          <div className="sidebar-brand-title">Warehouse Ledger</div>
          <div className="sidebar-brand-sub">Inventory & Billing</div>
        </div>
        <button onClick={onClose} className="sidebar-close-btn" aria-label="Close sidebar">
          <X size={18} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              className={`sidebar-item ${active ? "active" : ""}`}
            >
              <Icon size={16} />
              <span className="label">{n.label}</span>
              {n.href === "/stock" && lowCount > 0 && <span className="sidebar-badge">{lowCount}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button type="button" onClick={onLogout} className="sidebar-item sidebar-logout">
          <LogOut size={16} />
          <span className="label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
