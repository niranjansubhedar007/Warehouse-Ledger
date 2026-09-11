"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, BillLineInput } from "@/lib/types";
import { useServerPagedList } from "@/hooks/useServerPagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, IconBtn, SearchBar, Pagination, Modal, Field } from "@/components/ui";
import { money, normalizeNumberInput, normalizeNumberInputOnInput, todayISO } from "@/lib/format";
import { Plus, Trash2 } from "@/components/icons";

interface SaleRow {
  id: string;
  bill_number: string;
  date: string;
  customer_name: string;
  customer_mobile: string | null;
  subtotal: number;
  grand_total: number;
  sale_items: { quantity: number; shipping_weight: number }[];
}

export function SalesClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) showToast(error.message);
    else setItems(data as Item[]);
  }, [supabase, showToast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const loadPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase.from("sales").select("id, bill_number, date, customer_name, customer_mobile, subtotal, grand_total, sale_items(quantity, shipping_weight)", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + 9);
    if (query.trim()) request = request.or(`bill_number.ilike.%${query.trim()}%,customer_name.ilike.%${query.trim()}%,customer_mobile.ilike.%${query.trim()}%`);
    const { data, error, count } = await request;
    if (error) showToast(error.message, "error");
    return { data: (data || []) as unknown as SaleRow[], total: count || 0 };
  }, [supabase, showToast]);
  const salesList = useServerPagedList(loadPage);
  const { data: paged, loading, reload: load, query, setQuery, page, setPage, totalPages, totalCount, pageSize } = salesList;
  const sales = paged;

  const createSale = async (bill: {
    customerName: string;
    customerMobile: string;
    date: string;
    discount: number;
    tax: number;
    shippingCharge: number;
    lines: BillLineInput[];
  }) => {
    setSaving(true);
    const { error } = await supabase.rpc("create_sale", {
      p_customer_name: bill.customerName,
      p_customer_mobile: bill.customerMobile || null,
      p_date: bill.date,
      p_discount: bill.discount,
      p_tax: bill.tax,
      p_shipping_charge: bill.shippingCharge,
      p_items: bill.lines,
    });
    setSaving(false);
    if (error) {
      showToast(error.message);
      return false;
    }
    showToast("Bill created successfully and stock updated.", "success");
    setCreating(false);
    load();
    return true;
  };

  return (
    <div>
      <PageHeader title="Sales / Billing" subtitle="Create bills and issue invoices.">
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus size={15} /> New Bill
        </button>
      </PageHeader>

      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search bill no or customer" />
      </div>

      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Bill No", "Date", "Customer", "Items", "Weight", "Subtotal", "Grand Total"]}>
            {loading ? (
              <tr><Td colSpan={8} className="text-muted">Loading…</Td></tr>
            ) : paged.length === 0 ? (
              <tr><Td colSpan={8} className="text-muted">No bills match your search.</Td></tr>
            ) : (
              paged.map((s, idx) => {
                const totalWeight = s.sale_items.reduce((a, l) => a + Number(l.shipping_weight), 0);
                return (
                  <tr key={s.id}>
                    <Td>{(page - 1) * pageSize + idx + 1}</Td>
                    <Td className="mono">{s.bill_number}</Td>
                    <Td>{s.date}</Td>
                    <Td>{s.customer_name}</Td>
                    <Td className="num">{s.sale_items.length}</Td>
                    <Td className="num">{totalWeight.toFixed(2)} kg</Td>
                    <Td className="num">{money(s.subtotal)}</Td>
                    <Td className="strong num">{money(s.grand_total)}</Td>
                  </tr>
                );
              })
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>

      {creating && <BillForm items={items} saving={saving} onSave={createSale} onClose={() => setCreating(false)} />}
    </div>
  );
}

function BillForm({
  items,
  onSave,
  onClose,
  saving,
}: {
  items: Item[];
  saving: boolean;
  onSave: (bill: {
    customerName: string;
    customerMobile: string;
    date: string;
    discount: number;
    tax: number;
    shippingCharge: number;
    lines: BillLineInput[];
  }) => Promise<boolean>;
  onClose: () => void;
}) {
  const activeItems = useMemo(() => items.filter((i) => i.status === "Active"), [items]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [date, setDate] = useState(todayISO());
  const [lines, setLines] = useState<BillLineInput[]>(() => {
    const first = activeItems[0];
    return first ? [{ item_id: first.id, quantity: 1, selling_price: first.selling_price }] : [];
  });
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [shippingCharge, setShippingCharge] = useState(0);

  const addLine = () => {
    const first = activeItems[0];
    if (!first) return;
    setLines((l) => [...l, { item_id: first.id, quantity: 1, selling_price: first.selling_price }]);
  };
  const updateLine = (idx: number, patch: Partial<BillLineInput>) =>
    setLines((l) => l.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  const removeLine = (idx: number) => setLines((l) => l.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, ln) => s + ln.quantity * ln.selling_price, 0);
  const totalWeight = lines.reduce((s, ln) => {
    const item = items.find((i) => i.id === ln.item_id);
    return s + ln.quantity * (item ? item.shipping_weight : 0);
  }, 0);
  const grandTotal = subtotal - Number(discount || 0) + Number(tax || 0) + Number(shippingCharge || 0);
  const discountError = discount < 0
    ? "Discount cannot be negative."
    : discount > subtotal
      ? `Discount cannot be more than the subtotal of ${money(subtotal)}.`
      : "";
  const canSave = Boolean(customerName.trim()) && lines.length > 0 && lines.every((l) => l.quantity > 0) && !discountError;

  return (
    <Modal title="New Bill" onClose={onClose} wide>
      <div className="form-grid-3" style={{ marginBottom: 16 }}>
        <Field label="Customer Name" required>
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field label="Customer Mobile">
          <input className="input" maxLength={10} value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
        </Field>
        <Field label="Bill Date" required>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="table-scroll">
          <table className="data-table bill-table">
            <colgroup>
              <col className="col-sr" /><col className="col-item" /><col className="col-qty" />
              <col className="col-price" /><col className="col-wt" /><col className="col-amt" /><col className="col-del" />
            </colgroup>
            <thead>
              <tr>
                <th>Sr</th><th>Item</th><th>Qty</th><th>Price ₹</th><th>Ship. Wt</th><th>Amount</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, idx) => {
                const item = items.find((i) => i.id === ln.item_id);
                const over = item && ln.quantity > item.current_stock;
                const lineWeight = item ? (ln.quantity * item.shipping_weight).toFixed(2) : "0.00";
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <select
                        className="input"
                        value={ln.item_id}
                        onChange={(e) => {
                          const it = activeItems.find((i) => i.id === e.target.value);
                          if (it) updateLine(idx, { item_id: it.id, selling_price: it.selling_price });
                        }}
                      >
                        {item && item.status !== "Active" && <option value={item.id}>{item.name} (inactive)</option>}
                        {activeItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.current_stock} in stock)
                          </option>
                        ))}
                      </select>
                      {over && <div className="hint-danger">Only {item?.current_stock} units available.</div>}
                    </td>
                    <td>
                      <input type="number" min={1} className="input" value={ln.quantity} onInput={normalizeNumberInputOnInput} onChange={(e) => updateLine(idx, { quantity: Number(normalizeNumberInput(e.target.value) || 0) })} />
                    </td>
                    <td>
                      <input type="number" min={0} className="input" value={ln.selling_price} onInput={normalizeNumberInputOnInput} onChange={(e) => updateLine(idx, { selling_price: Number(normalizeNumberInput(e.target.value) || 0) })} />
                    </td>
                    <td className="num">{lineWeight} kg</td>
                    <td className="num">{money(ln.quantity * ln.selling_price)}</td>
                    <td>
                      <IconBtn onClick={() => removeLine(idx)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={addLine}
          disabled={activeItems.length === 0}
          className="btn-secondary full"
          type="button"
          style={{ width: "100%", borderRadius: 0, borderTop: "1px solid var(--border)" }}
        >
          + Add line item
        </button>
        {activeItems.length === 0 && (
          <p className="hint-danger" style={{ padding: "8px 16px 0" }}>
            No active items available to bill.
          </p>
        )}
      </div>

      <div className="form-grid-3" style={{ marginBottom: 16 }}>
        <Field label="Discount ₹">
          <input type="number" className="input" value={discount} onInput={normalizeNumberInputOnInput} onChange={(e) => setDiscount(Number(normalizeNumberInput(e.target.value) || 0))} />
          {discountError && <div className="hint-danger">{discountError}</div>}
        </Field>
        <Field label="Tax ₹">
          <input type="number" className="input" value={tax} onInput={normalizeNumberInputOnInput} onChange={(e) => setTax(Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
        <Field label="Shipping Charge ₹">
          <input type="number" className="input" value={shippingCharge} onInput={normalizeNumberInputOnInput} onChange={(e) => setShippingCharge(Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
      </div>

      <div className="totals-row">
        <div>
          Total Weight: <span className="strong num">{totalWeight.toFixed(2)} kg</span>
        </div>
        <div>
          Subtotal: <span className="strong num">{money(subtotal)}</span>
        </div>
        <div>
          Grand Total: <span className="strong num">{money(grandTotal)}</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} className="btn-secondary" type="button">
          Cancel
        </button>
        <button
          disabled={!canSave || saving}
          onClick={() => onSave({ customerName, customerMobile, date, discount, tax, shippingCharge, lines })}
          className="btn-primary"
          type="button"
        >
          {saving ? "Saving…" : "Confirm Bill"}
        </button>
      </div>
    </Modal>
  );
}
