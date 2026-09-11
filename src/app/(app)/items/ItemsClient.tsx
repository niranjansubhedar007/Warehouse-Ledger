"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { useServerPagedList } from "@/hooks/useServerPagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, Badge, IconBtn, SearchBar, Pagination, Modal, Field } from "@/components/ui";
import { money } from "@/lib/format";
import { normalizeNumberInput, normalizeNumberInputOnInput } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "@/components/icons";

type ItemFormValues = Omit<Item, "id" | "created_at">;

export function ItemsClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [removing, setRemoving] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase.from("items").select("*", { count: "exact" }).order("name").range(from, from + 9);
    if (query.trim()) request = request.ilike("name", `%${query.trim()}%`);
    const { data, error, count } = await request;
    if (error) showToast(error.message, "error");
    return { data: (data || []) as Item[], total: count || 0 };
  }, [supabase, showToast]);
  const itemsList = useServerPagedList(loadPage);
  const { data: paged, loading, reload: load, query, setQuery, page, setPage, totalPages, totalCount, pageSize } = itemsList;
  const items = paged;

  const save = async (form: ItemFormValues, id?: string) => {
    setSaving(true);
    if (id) {
      const { error } = await supabase.from("items").update(form).eq("id", id);
      if (error) showToast(error.message);
      else showToast(`Item "${form.name}" updated successfully.`, "success");
    } else {
      const { error } = await supabase.from("items").insert(form);
      if (error) showToast(error.message);
      else showToast(`Item "${form.name}" added successfully.`, "success");
    }
    setSaving(false);
    setEditing(null);
    await load();
  };

  const remove = async () => {
    if (!removing) return;
    const item = removing;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setRemoving(null);
    if (error) showToast(error.message);
    else {
      showToast(`Item "${item.name}" removed successfully.`, "success");
      load();
    }
  };

  return (
    <div>
      <PageHeader title="Item Master" subtitle="Products, pricing and stock thresholds.">
        <button onClick={() => setEditing("new")} className="btn-primary">
          <Plus size={15} /> Add Item
        </button>
      </PageHeader>

      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search item name" />
      </div>

      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Item", "Purchase ₹", "Selling ₹", "Ship. Wt (kg)", "Stock", "Threshold", "Status", ""]}>
            {loading ? (
              <tr>
                <Td colSpan={9} className="text-muted">Loading…</Td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <Td colSpan={9} className="text-muted">No items match your search.</Td>
              </tr>
            ) : (
              paged.map((i, idx) => (
                <tr key={i.id}>
                  <Td>{(page - 1) * pageSize + idx + 1}</Td>
                  <Td>{i.name}</Td>
                  <Td className="num">{money(i.purchase_price)}</Td>
                  <Td className="num">{money(i.selling_price)}</Td>
                  <Td className="num">{i.shipping_weight}</Td>
                  <Td className={`num ${i.current_stock < i.low_stock_threshold ? "text-danger" : ""}`}>
                    {i.current_stock}
                  </Td>
                  <Td className="num">{i.low_stock_threshold}</Td>
                  <Td>
                    <Badge active={i.status === "Active"}>{i.status}</Badge>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <IconBtn onClick={() => setEditing(i)}>
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn onClick={() => setRemoving(i)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>

      {editing && (
        <ItemForm
          item={editing === "new" ? null : editing}
          saving={saving}
          onSave={(form) => save(form, editing === "new" ? undefined : editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <Modal title="Confirm Remove" onClose={() => setRemoving(null)}>
          <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>
            Remove <strong>{removing.name}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setRemoving(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={remove}>Remove Item</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ItemForm({
  item,
  onSave,
  onClose,
  saving,
}: {
  item: Item | null;
  onSave: (form: ItemFormValues) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ItemFormValues>(
    item
      ? {
          name: item.name,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          shipping_weight: item.shipping_weight,
          current_stock: item.current_stock,
          low_stock_threshold: item.low_stock_threshold,
          status: item.status,
        }
      : {
          name: "",
          purchase_price: 0,
          selling_price: 0,
          shipping_weight: 0,
          current_stock: 0,
          low_stock_threshold: 5,
          status: "Active",
        }
  );
  const set = <K extends keyof ItemFormValues>(k: K, v: ItemFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={item ? "Edit Item" : "Add Item"} onClose={onClose}>
      <div className="form-grid-2">
        <Field label="Item Name" required>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Purchase Price" required>
          <input type="number" className="input" value={form.purchase_price} onInput={normalizeNumberInputOnInput} onChange={(e) => set("purchase_price", Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
        <Field label="Selling Price" required>
          <input type="number" className="input" value={form.selling_price} onInput={normalizeNumberInputOnInput} onChange={(e) => set("selling_price", Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
        <Field label="Shipping Weight (kg)" required>
          <input type="number" className="input" value={form.shipping_weight} onInput={normalizeNumberInputOnInput} onChange={(e) => set("shipping_weight", Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
        <Field label="Current Stock" required>
          <input type="number" className="input" value={form.current_stock} onInput={normalizeNumberInputOnInput} onChange={(e) => set("current_stock", Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
        <Field label="Low Stock Threshold" required>
          <input type="number" className="input" value={form.low_stock_threshold} onInput={normalizeNumberInputOnInput} onChange={(e) => set("low_stock_threshold", Number(normalizeNumberInput(e.target.value) || 0))} />
        </Field>
        <Field label="Status" required>
          <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as Item["status"])}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button onClick={onClose} className="btn-secondary" type="button">
          Cancel
        </button>
        <button disabled={saving || !form.name} onClick={() => onSave(form)} className="btn-primary" type="button">
          {saving ? "Saving…" : "Save Item"}
        </button>
      </div>
    </Modal>
  );
}
