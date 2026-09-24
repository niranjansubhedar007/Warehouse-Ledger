"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, Purchase } from "@/lib/types";
import { useServerPagedList } from "@/hooks/useServerPagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, IconBtn, SearchBar, Pagination, Modal, Field } from "@/components/ui";
import { formatDate, money, normalizeNumberInput, normalizeNumberInputOnInput, todayISO } from "@/lib/format";
import { Plus, Trash2 } from "@/components/icons";
import { ItemCombobox } from "@/components/ItemCombobox";

export function PurchaseClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Purchase | null>(null);

  const loadItems = useCallback(async () => {
    const itemsRes = await supabase.from("items").select("*").order("name");
    if (itemsRes.error) showToast(itemsRes.error.message);
    else setItems(itemsRes.data as Item[]);
  }, [supabase, showToast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const loadPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase.from("purchases").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + 9);
    if (query.trim()) request = request.or(`invoice_number.ilike.%${query.trim()}%,supplier.ilike.%${query.trim()}%`);
    const purchasesRes = await request;
    if (purchasesRes.error) showToast(purchasesRes.error.message, "error");
    const purchases = (purchasesRes.data || []) as (Purchase & { items?: { name?: string } | { name?: string }[] })[];
    const itemIds = purchases.map((purchase) => purchase.item_id).filter(Boolean);
    const { data: itemDetails } = itemIds.length
      ? await supabase.from("items").select("id, name").in("id", itemIds)
      : { data: [] as { id: string | number; name: string }[] };
    const itemMap = new Map((itemDetails || []).map((item) => [String(item.id), item.name]));
    const enrichedPurchases = purchases.map((purchase) => ({
      ...purchase,
      item_name: itemMap.get(String(purchase.item_id)) || "—",
    }));
    return { data: enrichedPurchases as Purchase[], total: purchasesRes.count || 0 };
  }, [supabase, showToast]);
  const purchasesList = useServerPagedList(loadPage);
  const { data: paged, loading, reload: load, query, setQuery, page, setPage, totalPages, totalCount, pageSize } = purchasesList;
  const purchases = paged;

  const itemName = (purchase: Purchase & { item_name?: string; items?: { name?: string }[] | { name?: string } }) => {
    const relatedItem = Array.isArray(purchase.items) ? purchase.items[0] : purchase.items;
    return purchase.item_name || relatedItem?.name || items.find((i) => String(i.id) === String(purchase.item_id))?.name || "—";
  };

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
    showToast("Purchase recorded successfully and stock updated.", "success");
    setAdding(false);
    load();
  };

  const deletePurchase = async () => {
    if (!deleting) return;
    const p = deleting;
    const { error } = await supabase.rpc("delete_purchase", { p_purchase_id: p.id });
    setDeleting(null);
    if (error) showToast(error.message);
    else {
      showToast("Purchase deleted successfully and stock reversed.", "success");
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
                  <Td>{formatDate(p.date)}</Td>
                  <Td>{p.supplier}</Td>
                  <Td>{itemName(p)}</Td>
                  <Td className="num">{p.quantity}</Td>
                  <Td className="num">{money(p.purchase_price)}</Td>
                  <Td className="num">{money(p.total_amount)}</Td>
                  <Td className="num">{p.shipping_weight} kg</Td>
                  <Td>
                    <IconBtn onClick={() => setDeleting(p)}>
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
      {deleting && (
        <Modal title="Confirm Delete" onClose={() => setDeleting(null)}>
          <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>
            Delete purchase <strong>{deleting.invoice_number}</strong>? Stock will be reversed.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={deletePurchase}>Delete Purchase</button>
          </div>
        </Modal>
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
        <Field label="Purchase Date" required>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Supplier Name" required>
          <input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </Field>
        <Field label="Item" required>
          <ItemCombobox items={items} value={itemId} onChange={setItemId} />
        </Field>
        <Field label="Quantity" required>
          <input type="number" className="input" value={quantity} onInput={normalizeNumberInputOnInput} onChange={(e) => setQuantity(normalizeNumberInput(e.target.value))} />
        </Field>
        <Field label="Purchase Price" required>
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
