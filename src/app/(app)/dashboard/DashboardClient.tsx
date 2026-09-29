"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { PageHeader, StatCard, Table, Td } from "@/components/ui";
import { SalesBarChart } from "@/components/SalesBarChart";
import { formatDate, money } from "@/lib/format";
import { useToast } from "@/components/ToastProvider";

interface SaleRow {
  date: string;
  grand_total: number;
  discount: number;
  sale_items: { quantity: number; selling_price: number; purchase_price: number }[];
}
interface PurchaseRow {
  date: string;
  total_amount: number;
}

const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export function DashboardClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [range, setRange] = useState<"today" | "yesterday" | "7d" | "30d">("7d");
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const cutoff = daysAgoISO(31);
    const [itemsRes, salesRes, purchasesRes] = await Promise.all([
      supabase.from("items").select("*").order("current_stock", { ascending: true }),
      supabase.from("sales").select("date, grand_total, discount, sale_items(quantity, selling_price, purchase_price)").gte("date", cutoff),
      supabase.from("purchases").select("date, total_amount").gte("date", cutoff),
    ]);
    if (itemsRes.error) showToast(itemsRes.error.message, "error");
    else setItems(itemsRes.data as Item[]);
    if (salesRes.error) showToast(salesRes.error.message, "error");
    else setSales(salesRes.data as unknown as SaleRow[]);
    if (purchasesRes.error) showToast(purchasesRes.error.message, "error");
    else setPurchases(purchasesRes.data as PurchaseRow[]);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const lowStockItems = useMemo(
    () => items.filter((i) => i.current_stock < i.low_stock_threshold),
    [items]
  );

  const rangeDays = range === "today" ? 1 : range === "yesterday" ? 1 : range === "7d" ? 7 : 30;
  const rangeEndOffset = range === "yesterday" ? 1 : 0;
  const rangeStartDate = daysAgoISO(rangeEndOffset + rangeDays - 1);
  const rangeEndDate = daysAgoISO(rangeEndOffset);
  const isInSelectedRange = (date: string) => date >= rangeStartDate && date <= rangeEndDate;
  const periodSales = sales
    .filter((sale) => isInSelectedRange(sale.date))
    .reduce((sum, sale) => sum + Number(sale.grand_total), 0);
  const periodPurchase = purchases
    .filter((purchase) => isInSelectedRange(purchase.date))
    .reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);
  const periodProfit = sales
    .filter((sale) => isInSelectedRange(sale.date))
    .reduce((sum, s) => {
      const itemProfit = s.sale_items.reduce(
        (subtotal, line) => subtotal + (Number(line.selling_price) - Number(line.purchase_price)) * Number(line.quantity),
        0
      );
      return sum + itemProfit - Number(s.discount || 0);
    }, 0);

  const rangeLabel = range === "today"
    ? "Today's"
    : range === "yesterday"
      ? "Yesterday's"
      : range === "7d"
        ? "Last 7 Days'"
        : "Last 30 Days'";

  const chartData = useMemo(() => {
    const days = [];
    for (let i = rangeDays - 1 + rangeEndOffset; i >= rangeEndOffset; i--) {
      const d = daysAgoISO(i);
      const total = sales.filter((s) => s.date === d).reduce((sum, s) => sum + Number(s.grand_total), 0);
      days.push({ date: formatDate(d).slice(0, 5), total });
    }
    return days;
  }, [sales, rangeDays, rangeEndOffset]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Today's activity across purchase, sales and stock." />
      <div className="stat-grid">
        <StatCard label={`${rangeLabel} Sales`} value={money(Math.abs(periodSales))} color="var(--green)" />
        <StatCard label={`${rangeLabel} Purchase`} value={money(periodPurchase)} color="var(--blue)" />
        <StatCard label={`${rangeLabel} Profit`} value={money(periodProfit)} color="var(--orange)" />
        <StatCard label="Low Stock Items" value={loading ? "…" : lowStockItems.length} color="var(--accent)" />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Sales</h3>
          <div className="tab-row" style={{ marginBottom: 0 }}>
            {(
              [
                ["today", "Today"],
                ["yesterday", "Yesterday"],
                ["7d", "7 Days"],
                ["30d", "30 Days"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} onClick={() => setRange(k)} className={`tab ${range === k ? "active" : ""}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <SalesBarChart data={chartData} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Low Stock Items</h3>
        {lowStockItems.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>
            {loading ? "Loading…" : "Nothing below threshold right now."}
          </p>
        ) : (
          <>
            <div className="table-scroll">
              <Table headers={["Sr", "Item", "Stock", "Threshold"]}>
                {lowStockItems.slice(0, 5).map((i, idx) => (
                  <tr key={i.id}>
                    <Td>{idx + 1}</Td>
                    <Td>{i.name}</Td>
                    <Td>
                      <span className="text-danger">{i.current_stock}</span>
                    </Td>
                    <Td>{i.low_stock_threshold}</Td>
                  </tr>
                ))}
              </Table>
            </div>
            {lowStockItems.length > 5 && (
              <p className="text-muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                +{lowStockItems.length - 5} more — see the Low Stock filter on the Stock page.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
