"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { usePagedList } from "@/hooks/usePagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, StatCard, Table, Td, SearchBar, Pagination } from "@/components/ui";
import { money } from "@/lib/format";

interface SaleLineRow {
  bill_number: string;
  date: string;
  customer_name: string;
  item_name: string;
  quantity: number;
  shipping_weight: number;
  purchase_price: number;
  selling_price: number;
  profit: number;
}

interface PurchaseRow {
  id: string;
  invoice_number: string;
  date: string;
  supplier: string;
  item_name: string;
  quantity: number;
  purchase_price: number;
  total_amount: number;
  shipping_weight: number;
}

interface ProfitRow {
  item_id: string;
  item_name: string;
  unitsSold: number;
  profit: number;
}

export function ReportsClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [tab, setTab] = useState<"sales" | "purchase" | "profit">("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  const [salesRows, setSalesRows] = useState<SaleLineRow[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [profitRows, setProfitRows] = useState<ProfitRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);

    const [itemsRes] = await Promise.all([supabase.from("items").select("*")]);
    const items = (itemsRes.data || []) as Item[];
    const itemName = (id: string) => items.find((i) => i.id === id)?.name || "—";

    let salesQuery = supabase.from("sales").select("id, bill_number, date, customer_name, grand_total").order("date", { ascending: false }).limit(2000);
    if (startDate) salesQuery = salesQuery.gte("date", startDate);
    if (endDate) salesQuery = salesQuery.lte("date", endDate);
    const salesRes = await salesQuery;

    let purchaseQuery = supabase.from("purchases").select("*").order("date", { ascending: false }).limit(2000);
    if (startDate) purchaseQuery = purchaseQuery.gte("date", startDate);
    if (endDate) purchaseQuery = purchaseQuery.lte("date", endDate);
    const purchaseRes = await purchaseQuery;

    if (salesRes.error) showToast(salesRes.error.message);
    if (purchaseRes.error) showToast(purchaseRes.error.message);

    const sales = salesRes.data || [];
    const saleIds = sales.map((s) => s.id);
    const saleById = new Map(sales.map((s) => [s.id, s]));

    let saleItems: { sale_id: string; item_id: string; quantity: number; selling_price: number; purchase_price: number; shipping_weight: number; profit: number }[] = [];
    if (saleIds.length > 0) {
      const { data, error } = await supabase
        .from("sale_items")
        .select("sale_id, item_id, quantity, selling_price, purchase_price, shipping_weight, profit")
        .in("sale_id", saleIds);
      if (error) showToast(error.message);
      else saleItems = data || [];
    }

    const flatSalesRows: SaleLineRow[] = saleItems.map((l) => {
      const sale = saleById.get(l.sale_id);
      return {
        bill_number: sale?.bill_number || "",
        date: sale?.date || "",
        customer_name: sale?.customer_name || "",
        item_name: itemName(l.item_id),
        quantity: Number(l.quantity),
        shipping_weight: Number(l.shipping_weight),
        purchase_price: Number(l.purchase_price),
        selling_price: Number(l.selling_price),
        profit: Number(l.profit),
      };
    });

    const flatPurchaseRows: PurchaseRow[] = (purchaseRes.data || []).map((p) => ({
      id: p.id,
      invoice_number: p.invoice_number,
      date: p.date,
      supplier: p.supplier,
      item_name: itemName(p.item_id),
      quantity: Number(p.quantity),
      purchase_price: Number(p.purchase_price),
      total_amount: Number(p.total_amount),
      shipping_weight: Number(p.shipping_weight),
    }));

    const profitByItem = new Map<string, { unitsSold: number; profit: number }>();
    saleItems.forEach((l) => {
      const entry = profitByItem.get(l.item_id) || { unitsSold: 0, profit: 0 };
      entry.unitsSold += Number(l.quantity);
      entry.profit += Number(l.profit);
      profitByItem.set(l.item_id, entry);
    });
    const flatProfitRows: ProfitRow[] = Array.from(profitByItem.entries())
      .map(([item_id, v]) => ({ item_id, item_name: itemName(item_id), unitsSold: v.unitsSold, profit: v.profit }))
      .filter((r) => r.unitsSold > 0);

    setSalesRows(flatSalesRows);
    setPurchaseRows(flatPurchaseRows);
    setProfitRows(flatProfitRows);
    setTotalRevenue(sales.reduce((s, sale) => s + Number(sale.grand_total), 0));
    setTotalProfit(flatSalesRows.reduce((s, r) => s + r.profit, 0));
    setLoading(false);
  }, [supabase, showToast, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const hasDateFilter = startDate || endDate;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales, purchase and profit history." />

      <div className="date-filter-row">
        <div className="date-field">
          <div className="field-label">From</div>
          <input type="date" className="input" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="date-field">
          <div className="field-label">To</div>
          <input type="date" className="input" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {hasDateFilter && (
          <button type="button" className="btn-secondary" onClick={() => { setStartDate(""); setEndDate(""); }}>
            Clear dates
          </button>
        )}
      </div>

      <div className="tab-row bordered">
        {(
          [
            ["sales", "Sales"],
            ["purchase", "Purchase"],
            ["profit", "Profit"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`tab ${tab === k ? "active" : ""}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "sales" && <SalesReportTab rows={salesRows} loading={loading} />}
      {tab === "purchase" && <PurchaseReportTab rows={purchaseRows} loading={loading} />}
      {tab === "profit" && (
        <ProfitReportTab rows={profitRows} loading={loading} totalRevenue={totalRevenue} totalProfit={totalProfit} />
      )}
    </div>
  );
}

function SalesReportTab({ rows, loading }: { rows: SaleLineRow[]; loading: boolean }) {
  const { query, setQuery, page, setPage, totalPages, paged, totalCount, pageSize } = usePagedList(rows, (r, q) =>
    r.bill_number.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q) || r.item_name.toLowerCase().includes(q)
  );
  return (
    <div>
      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search bill no, customer or item" />
      </div>
      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Bill No", "Date", "Customer", "Item", "Qty", "Weight", "Purchase ₹", "Sell ₹", "Profit ₹"]}>
            {loading ? (
              <tr><Td colSpan={10} className="text-muted">Loading…</Td></tr>
            ) : paged.length === 0 ? (
              <tr><Td colSpan={10} className="text-muted">No sales lines match your search.</Td></tr>
            ) : (
              paged.map((row, idx) => (
                <tr key={idx}>
                  <Td>{(page - 1) * pageSize + idx + 1}</Td>
                  <Td className="mono">{row.bill_number}</Td>
                  <Td>{row.date}</Td>
                  <Td>{row.customer_name}</Td>
                  <Td>{row.item_name}</Td>
                  <Td className="num">{row.quantity}</Td>
                  <Td className="num">{row.shipping_weight.toFixed(2)} kg</Td>
                  <Td className="num">{money(row.purchase_price)}</Td>
                  <Td className="num">{money(row.selling_price)}</Td>
                  <Td className="text-success num">{money(row.profit)}</Td>
                </tr>
              ))
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}

function PurchaseReportTab({ rows, loading }: { rows: PurchaseRow[]; loading: boolean }) {
  const { query, setQuery, page, setPage, totalPages, paged, totalCount, pageSize } = usePagedList(rows, (r, q) =>
    r.invoice_number.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q) || r.item_name.toLowerCase().includes(q)
  );
  return (
    <div>
      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search invoice, supplier or item" />
      </div>
      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Invoice No", "Date", "Supplier", "Item", "Qty", "Price ₹", "Total ₹", "Weight"]}>
            {loading ? (
              <tr><Td colSpan={9} className="text-muted">Loading…</Td></tr>
            ) : paged.length === 0 ? (
              <tr><Td colSpan={9} className="text-muted">No purchases match your search.</Td></tr>
            ) : (
              paged.map((p, idx) => (
                <tr key={p.id}>
                  <Td>{(page - 1) * pageSize + idx + 1}</Td>
                  <Td className="mono">{p.invoice_number}</Td>
                  <Td>{p.date}</Td>
                  <Td>{p.supplier}</Td>
                  <Td>{p.item_name}</Td>
                  <Td className="num">{p.quantity}</Td>
                  <Td className="num">{money(p.purchase_price)}</Td>
                  <Td className="num">{money(p.total_amount)}</Td>
                  <Td className="num">{p.shipping_weight} kg</Td>
                </tr>
              ))
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}

function ProfitReportTab({
  rows,
  loading,
  totalRevenue,
  totalProfit,
}: {
  rows: ProfitRow[];
  loading: boolean;
  totalRevenue: number;
  totalProfit: number;
}) {
  const { query, setQuery, page, setPage, totalPages, paged, totalCount, pageSize } = usePagedList(rows, (r, q) =>
    r.item_name.toLowerCase().includes(q)
  );
  return (
    <div>
      <div className="stat-grid-2">
        <StatCard label="Total Revenue" value={money(totalRevenue)} color="var(--blue)" />
        <StatCard label="Total Profit" value={money(totalProfit)} color="var(--green)" />
      </div>
      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search item name" />
      </div>
      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Item", "Units Sold", "Total Profit ₹"]}>
            {loading ? (
              <tr><Td colSpan={4} className="text-muted">Loading…</Td></tr>
            ) : paged.length === 0 ? (
              <tr><Td colSpan={4} className="text-muted">No items match your search.</Td></tr>
            ) : (
              paged.map((r, idx) => (
                <tr key={r.item_id}>
                  <Td>{(page - 1) * pageSize + idx + 1}</Td>
                  <Td>{r.item_name}</Td>
                  <Td className="num">{r.unitsSold}</Td>
                  <Td className="text-success num">{money(r.profit)}</Td>
                </tr>
              ))
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}
