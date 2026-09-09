"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { usePagedList } from "@/hooks/usePagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, Badge, IconBtn, SearchBar, Pagination, Modal, Field } from "@/components/ui";
import { money } from "@/lib/format";
import { Plus, Pencil, Trash2 } from "@/components/icons";

type ItemFormValues = Omit<Item, "id" | "created_at">;

export function ItemsClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) showToast(error.message);
    else setItems(data as Item[]);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const { query, setQuery, page, setPage, totalPages, paged, totalCount, pageSize } = usePagedList(
    items,
    (i, q) => i.name.toLowerCase().includes(q)
  );

  const save = async (form: ItemFormValues, id?: string) => {
    setSaving(true);
    if (id) {
      const { error } = await supabase.from("items").update(form).eq("id", id);
      if (error) showToast(error.message);
      else showToast(`Updated ${form.name}.`, "success");
    } else {
      const { error } = await supabase.from("items").insert(form);
      if (error) showToast(error.message);
      else showToast(`Added ${form.name} to Item Master.`, "success");
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const remove = async (item: Item) => {
    if (!confirm(`Remove ${item.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) showToast(error.message);
    else {
      showToast(`Removed ${item.name}.`, "success");
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
                      <IconBtn onClick={() => remove(i)}>
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
        <Field label="Item Name">
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Purchase Price">
          <input type="number" className="input" value={form.purchase_price} onChange={(e) => set("purchase_price", Number(e.target.value))} />
        </Field>
        <Field label="Selling Price">
          <input type="number" className="input" value={form.selling_price} onChange={(e) => set("selling_price", Number(e.target.value))} />
        </Field>
        <Field label="Shipping Weight (kg)">
          <input type="number" className="input" value={form.shipping_weight} onChange={(e) => set("shipping_weight", Number(e.target.value))} />
        </Field>
        <Field label="Current Stock">
          <input type="number" className="input" value={form.current_stock} onChange={(e) => set("current_stock", Number(e.target.value))} />
        </Field>
        <Field label="Low Stock Threshold">
          <input type="number" className="input" value={form.low_stock_threshold} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} />
        </Field>
        <Field label="Status">
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
