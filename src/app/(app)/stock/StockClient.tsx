"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, StockTransaction } from "@/lib/types";
import { usePagedList } from "@/hooks/usePagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, Badge, SearchBar, Pagination } from "@/components/ui";

export function StockClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<"stock" | "transactions">("stock");

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, txRes] = await Promise.all([
      supabase.from("items").select("*").order("name"),
      supabase.from("stock_transactions").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (itemsRes.error) showToast(itemsRes.error.message);
    else setItems(itemsRes.data as Item[]);
    if (txRes.error) showToast(txRes.error.message);
    else setTransactions(txRes.data as StockTransaction[]);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const lowCount = useMemo(() => items.filter((i) => i.current_stock < i.low_stock_threshold).length, [items]);
  const baseItems = useMemo(
    () => (showLowOnly ? items.filter((i) => i.current_stock < i.low_stock_threshold) : items),
    [items, showLowOnly]
  );
  const stockList = usePagedList(baseItems, (i, q) => i.name.toLowerCase().includes(q));
  const txList = usePagedList(transactions, (t, q) => {
    const item = items.find((i) => i.id === t.item_id);
    return (
      (item?.name || "").toLowerCase().includes(q) ||
      t.transaction_type.toLowerCase().includes(q) ||
      (t.reference_id || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader title="Stock Management" subtitle="Live quantities, low-stock alerts and the audit trail behind them." />

      <div className="tab-row bordered">
        <button type="button" className={`tab ${activeTab === "stock" ? "active" : ""}`} onClick={() => setActiveTab("stock")}>
          Stock Management
        </button>
        <button type="button" className={`tab ${activeTab === "transactions" ? "active" : ""}`} onClick={() => setActiveTab("transactions")}>
          Recent Stock Transactions
        </button>
      </div>

      {activeTab === "stock" ? (
        <>
          <div className="list-toolbar">
            <SearchBar value={stockList.query} onChange={stockList.setQuery} placeholder="Search item name" />
            <div className="filter-toggle">
              <button type="button" className={showLowOnly ? "" : "active"} onClick={() => setShowLowOnly(false)}>
                All Items
              </button>
              <button type="button" className={showLowOnly ? "active" : ""} onClick={() => setShowLowOnly(true)}>
                Low Stock{lowCount > 0 ? ` (${lowCount})` : ""}
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="table-scroll">
              <Table headers={["Sr", "Item", "Current Stock", "Threshold", "Status"]}>
                {loading ? (
                  <tr><Td colSpan={5} className="text-muted">Loading…</Td></tr>
                ) : stockList.paged.length === 0 ? (
                  <tr>
                    <Td colSpan={5} className="text-muted">
                      {showLowOnly ? "Nothing below threshold right now." : "No items match your search."}
                    </Td>
                  </tr>
                ) : (
                  stockList.paged.map((i, idx) => (
                    <tr key={i.id}>
                      <Td>{(stockList.page - 1) * stockList.pageSize + idx + 1}</Td>
                      <Td>{i.name}</Td>
                      <Td className={`num ${i.current_stock < i.low_stock_threshold ? "text-danger" : "strong"}`}>{i.current_stock}</Td>
                      <Td className="num">{i.low_stock_threshold}</Td>
                      <Td>{i.current_stock < i.low_stock_threshold ? <Badge>Low</Badge> : <Badge active>OK</Badge>}</Td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
            <Pagination page={stockList.page} totalPages={stockList.totalPages} totalCount={stockList.totalCount} pageSize={stockList.pageSize} onChange={stockList.setPage} />
          </div>
        </>
      ) : (
        <>
          <div className="list-toolbar">
            <SearchBar value={txList.query} onChange={txList.setQuery} placeholder="Search item, type or reference" />
          </div>
          <div className="panel">
            <div className="table-scroll">
              <Table headers={["Sr", "Item", "Type", "Reference", "Qty Change", "Prev → New"]}>
                {loading ? (
                  <tr><Td colSpan={6} className="text-muted">Loading…</Td></tr>
                ) : txList.paged.length === 0 ? (
                  <tr>
                    <Td colSpan={6} className="text-muted">
                      {transactions.length === 0 ? "No stock movements yet." : "No transactions match your search."}
                    </Td>
                  </tr>
                ) : (
                  txList.paged.map((t, idx) => {
                    const item = items.find((i) => i.id === t.item_id);
                    return (
                      <tr key={t.id}>
                        <Td>{(txList.page - 1) * txList.pageSize + idx + 1}</Td>
                        <Td>{item?.name || "—"}</Td>
                        <Td>
                          <span className="mono" style={{ background: "var(--surface-sunken)", padding: "2px 6px", borderRadius: 4 }}>
                            {t.transaction_type}
                          </span>
                        </Td>
                        <Td className="mono">{t.reference_id}</Td>
                        <Td className={`num ${t.quantity < 0 ? "text-danger" : "text-success"}`}>
                          {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                        </Td>
                        <Td className="num">
                          {t.previous_stock} → {t.new_stock}
                        </Td>
                      </tr>
                    );
                  })
                )}
              </Table>
            </div>
            <Pagination page={txList.page} totalPages={txList.totalPages} totalCount={txList.totalCount} pageSize={txList.pageSize} onChange={txList.setPage} />
          </div>
        </>
      )}
    </div>
  );
}
