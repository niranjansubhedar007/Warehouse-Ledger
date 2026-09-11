import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Warehouse Ledger",
  description: "Inventory, purchase, sales/billing and stock tracking.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  let isDarkMode = false;

  if (session) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_dark_mode")
      .eq("id", session.id)
      .maybeSingle();
    isDarkMode = profile?.is_dark_mode ?? session.is_dark_mode;
  }

  return (
    <html lang="en" data-theme={isDarkMode ? "dark" : "light"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
