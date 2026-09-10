"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, Purchase } from "@/lib/types";
import { usePagedList } from "@/hooks/usePagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, IconBtn, SearchBar, Pagination, Modal, Field } from "@/components/ui";
import { money, normalizeNumberInput, normalizeNumberInputOnInput, todayISO } from "@/lib/format";
import { Plus, Trash2 } from "@/components/icons";

export function PurchaseClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, purchasesRes] = await Promise.all([
      supabase.from("items").select("*").order("name"),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
    ]);
    if (itemsRes.error) showToast(itemsRes.error.message);
    else setItems(itemsRes.data as Item[]);
    if (purchasesRes.error) showToast(purchasesRes.error.message);
    else setPurchases(purchasesRes.data as Purchase[]);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const itemName = (id: string) => items.find((i) => i.id === id)?.name || "—";

  const { query, setQuery, page, setPage, totalPages, paged, totalCount, pageSize } = usePagedList(
    purchases,
    (p, q) =>
      p.invoice_number.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q) ||
      itemName(p.item_id).toLowerCase().includes(q)
  );

  const addPurchase = async (form: { supplier: string; item_id: string; quantity: number; purchase_price: number; date: string }) => {
    setSaving(true);
    const { error } = await supabase.rpc("create_purchase", {
      p_supplier: form.supplier,
      p_item_id: form.item_id,
      p_quantity: form.quantity,
      p_purchase_price: form.purchase_price,
      p_date: form.date,
    });
    setSaving(false);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Purchase recorded and stock updated.", "success");
    setAdding(false);
    load();
  };

  const deletePurchase = async (p: Purchase) => {
    if (!confirm(`Delete purchase ${p.invoice_number}? Stock will be reversed.`)) return;
    const { error } = await supabase.rpc("delete_purchase", { p_purchase_id: p.id });
    if (error) showToast(error.message);
    else {
      showToast("Purchase deleted.", "success");
      load();
    }
  };

  return (
    <div>
      <PageHeader title="Purchase Master" subtitle="Record stock intake from suppliers.">
        <button onClick={() => setAdding(true)} className="btn-primary">
          <Plus size={15} /> New Purchase
        </button>
      </PageHeader>

      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search invoice, supplier or item" />
      </div>

      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Invoice No", "Date", "Supplier", "Item", "Qty", "Price ₹", "Total ₹", "Weight", ""]}>
            {loading ? (
              <tr><Td colSpan={10} className="text-muted">Loading…</Td></tr>
            ) : paged.length === 0 ? (
              <tr><Td colSpan={10} className="text-muted">No purchases match your search.</Td></tr>
            ) : (
              paged.map((p, idx) => (
                <tr key={p.id}>
                  <Td>{(page - 1) * pageSize + idx + 1}</Td>
                  <Td className="mono">{p.invoice_number}</Td>
                  <Td>{p.date}</Td>
                  <Td>{p.supplier}</Td>
                  <Td>{itemName(p.item_id)}</Td>
                  <Td className="num">{p.quantity}</Td>
                  <Td className="num">{money(p.purchase_price)}</Td>
                  <Td className="num">{money(p.total_amount)}</Td>
                  <Td className="num">{p.shipping_weight} kg</Td>
                  <Td>
                    <IconBtn onClick={() => deletePurchase(p)}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>

      {adding && (
        <PurchaseForm items={items} saving={saving} onSave={addPurchase} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function PurchaseForm({
  items,
  onSave,
  onClose,
  saving,
}: {
  items: Item[];
  onSave: (form: { supplier: string; item_id: string; quantity: number; purchase_price: number; date: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [date, setDate] = useState(todayISO());
  const [supplier, setSupplier] = useState("");
  const [itemId, setItemId] = useState(items[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");

  const canSave = supplier && itemId && Number(quantity) > 0 && Number(purchasePrice) >= 0;

  return (
    <Modal title="New Purchase" onClose={onClose}>
      <div className="form-grid-2">
        <Field label="Purchase Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Supplier Name">
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </Field>
        <Field label="Item">
          <select className="input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quantity">
          <input type="number" className="input" value={quantity} onInput={normalizeNumberInputOnInput} onChange={(e) => setQuantity(normalizeNumberInput(e.target.value))} />
        </Field>
        <Field label="Purchase Price">
          <input type="number" className="input" value={purchasePrice} onInput={normalizeNumberInputOnInput} onChange={(e) => setPurchasePrice(normalizeNumberInput(e.target.value))} />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button onClick={onClose} className="btn-secondary" type="button">
          Cancel
        </button>
        <button
          disabled={!canSave || saving}
          onClick={() => onSave({ supplier, item_id: itemId, quantity: Number(quantity), purchase_price: Number(purchasePrice), date })}
          className="btn-primary"
          type="button"
        >
          {saving ? "Saving…" : "Save Purchase"}
        </button>
      </div>
    </Modal>
  );
}
