"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  sale_items: { quantity: number; selling_price: number; purchase_price: number; profit: number }[];
}
interface PurchaseRow {
  date: string;
  total_amount: number;
}

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

type PresetRange = "today" | "yesterday" | "7d" | "30d";

export function DashboardClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [range, setRange] = useState<PresetRange | "custom">("custom");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    const fetchSales = async () => {
      const rows: SaleRow[] = [];
      for (let from = 0; ; from += 1000) {
        let query = supabase.from("sales").select("date, grand_total, discount, sale_items(quantity, selling_price, purchase_price, profit)");
        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);
        const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false }).range(from, from + 999);
        if (error) return { rows: null, error };
        const batch = (data || []) as unknown as SaleRow[];
        rows.push(...batch);
        if (batch.length < 1000) break;
      }
      return { rows, error: null };
    };
    const fetchPurchases = async () => {
      const rows: PurchaseRow[] = [];
      for (let from = 0; ; from += 1000) {
        let query = supabase.from("purchases").select("date, total_amount");
        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);
        const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false }).range(from, from + 999);
        if (error) return { rows: null, error };
        const batch = (data || []) as PurchaseRow[];
        rows.push(...batch);
        if (batch.length < 1000) break;
      }
      return { rows, error: null };
    };
    const [itemsRes, salesRes, purchasesRes] = await Promise.all([
      supabase.from("items").select("*").order("current_stock", { ascending: true }),
      fetchSales(),
      fetchPurchases(),
    ]);
    if (currentRequestId !== requestId.current) return;
    if (itemsRes.error) showToast(itemsRes.error.message, "error");
    else setItems(itemsRes.data as Item[]);
    if (salesRes.error) showToast(salesRes.error.message, "error");
    else if (salesRes.rows) setSales(salesRes.rows);
    if (purchasesRes.error) showToast(purchasesRes.error.message, "error");
    else if (purchasesRes.rows) setPurchases(purchasesRes.rows);
    setLoading(false);
  }, [supabase, showToast, startDate, endDate]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const lowStockItems = useMemo(
    () => items.filter((i) => i.current_stock < i.low_stock_threshold),
    [items]
  );

  const selectRange = (selectedRange: PresetRange) => {
    const endOffset = selectedRange === "yesterday" ? 1 : 0;
    const days = selectedRange === "today" || selectedRange === "yesterday" ? 1 : selectedRange === "7d" ? 7 : 30;
    setRange(selectedRange);
    setStartDate(daysAgoISO(endOffset + days - 1));
    setEndDate(daysAgoISO(endOffset));
  };
  const updateStartDate = (value: string) => {
    setRange("custom");
    setStartDate(value);
  };
  const updateEndDate = (value: string) => {
    setRange("custom");
    setEndDate(value);
  };
  const periodSales = sales.reduce((sum, sale) => sum + Number(sale.grand_total), 0);
  const periodPurchase = purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);
  const periodProfit = sales.reduce((sum, s) => {
    const itemProfit = s.sale_items.reduce((subtotal, line) => subtotal + Number(line.profit), 0);
    return sum + itemProfit - Number(s.discount || 0);
  }, 0);

  const chartData = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
    const rangeLength = start && end
      ? (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86_400_000
      : null;
    const groupByMonth = !start || !end || (rangeLength !== null && rangeLength > 30);
    const totals = new Map<string, number>();
    for (const sale of sales) {
      const key = groupByMonth
        ? sale.date.slice(0, 7)
        : sale.date;
      totals.set(key, (totals.get(key) || 0) + Number(sale.grand_total));
    }
    if (start && end && !groupByMonth && start <= end) {
      const dailyData = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const date = toISODate(cursor);
        dailyData.push({ date: formatDate(date).slice(0, 5), total: totals.get(date) || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
      return dailyData;
    }
    return [...totals.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, total]) => ({
        date: date.length === 7 ? formatDate(`${date}-01`).slice(3) : formatDate(date).slice(0, 5),
        total,
      }));
  }, [sales, startDate, endDate]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Sales, purchases and profit show all-time totals unless you select a date range." />
      <div className="list-toolbar" style={{ justifyContent: "flex-end" }}>
        <div className="date-field">
          <input
            type="date"
            className="input"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => updateStartDate(event.target.value)}
            aria-label="Dashboard start date"
          />
        </div>
        <div className="date-field">
          <input
            type="date"
            className="input"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => updateEndDate(event.target.value)}
            aria-label="Dashboard end date"
          />
        </div>
      </div>
      <p className="text-muted" style={{ fontSize: 12, marginTop: -12, marginBottom: 16 }}>
        The date range applies to Sales, Purchase, Profit and the chart. Low Stock Items shows the current stock status.
      </p>
      <div className="stat-grid">
        <StatCard label="Sales" value={loading ? "…" : money(Math.abs(periodSales))} color="var(--green)" />
        <StatCard label="Purchase" value={loading ? "…" : money(periodPurchase)} color="var(--blue)" />
        <StatCard label="Profit" value={loading ? "…" : money(periodProfit)} color="var(--orange)" />
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
              <button key={k} onClick={() => selectRange(k)} className={`tab ${range === k ? "active" : ""}`}>
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
