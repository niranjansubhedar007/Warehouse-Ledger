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
  FileText,
  UserPlus,
  LogOut,
  X,
  ChevronUp,
  ChevronDown,
} from "@/components/icons";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly?: boolean;
  children?: NavItem[];
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, adminOnly: true },
  { href: "/items", label: "Item Master", icon: Package },
  { href: "/purchase", label: "Purchase", icon: ShoppingCart },
  { href: "/sales", label: "Quotation / Billing", icon: Receipt },
  { href: "/stock", label: "Stock", icon: Boxes },
  {
    href: "/reports",
    label: "Reports",
    icon: FileBarChart,
    adminOnly: true,
    children: [
      { href: "/reports", label: "Sales Report", icon: Receipt, adminOnly: true },
      { href: "/reports/purchase", label: "Purchase Report", icon: ShoppingCart, adminOnly: true },
      { href: "/reports/profit", label: "Profit Report", icon: FileBarChart, adminOnly: true },
      { href: "/reports/quotations", label: "Quotation Report", icon: FileText, adminOnly: true },
    ],
  },
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
  const reportsActive = pathname.startsWith("/reports");
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

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
          const reportChildren = n.children?.filter((child) => !child.adminOnly || role === "admin") || [];
          return (
            <div key={n.href}>
              {n.children ? (
                <div className={`sidebar-item ${active || reportsActive ? "active" : ""}`}>
                  <Icon size={16} />
                  <Link href={n.href} onClick={onNavigate} className="label">{n.label}</Link>
                  <button
                    type="button"
                    className="sidebar-expand"
                    aria-label={reportsOpen ? "Collapse reports" : "Expand reports"}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setReportsOpen((open) => !open);
                    }}
                  >
                    {reportsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              ) : (
                <Link href={n.href} onClick={onNavigate} className={`sidebar-item ${active ? "active" : ""}`}>
                  <Icon size={16} />
                  <span className="label">{n.label}</span>
                  {n.href === "/stock" && lowCount > 0 && <span className="sidebar-badge">{lowCount}</span>}
                </Link>
              )}
              {n.children && reportsOpen && reportChildren.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Link key={child.href} href={child.href} onClick={onNavigate} className={`sidebar-item sidebar-child ${pathname === child.href ? "active" : ""}`}>
                    <ChildIcon size={14} />
                    <span className="label">{child.label}</span>
                  </Link>
                );
              })}
            </div>
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
