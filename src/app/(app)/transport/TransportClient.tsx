"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerPagedList } from "@/hooks/useServerPagedList";
import { useToast } from "@/components/ToastProvider";
import { Field, Modal, PageHeader, Pagination, SearchBar, Table, Td } from "@/components/ui";
import { formatDate, money, normalizeNumberInput, normalizeNumberInputOnInput, todayISO } from "@/lib/format";
import { Plus, Trash2 } from "@/components/icons";
import type { TransportCharge, TransportChargeType } from "@/lib/transport";

export function TransportClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<TransportCharge | null>(null);

  const loadPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase.from("transport_charges").select("*", { count: "exact" }).order("date", { ascending: false }).range(from, from + 9);
    if (query.trim()) {
      request = request.or(`description.ilike.%${query.trim()}%,provider.ilike.%${query.trim()}%,reference_number.ilike.%${query.trim()}%`);
    }
    const { data, error, count } = await request;
    if (error) showToast(error.message, "error");
    return { data: (data || []) as TransportCharge[], total: count || 0 };
  }, [showToast, supabase]);

  const list = useServerPagedList(loadPage);
  const { data, loading, query, setQuery, page, setPage, totalPages, totalCount, pageSize, reload } = list;

  const save = async (form: Omit<TransportCharge, "id" | "created_at">) => {
    setSaving(true);
    const { error } = await supabase.from("transport_charges").insert(form);
    setSaving(false);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("Transport charge added successfully.", "success");
    setAdding(false);
    reload();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("transport_charges").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) showToast(error.message, "error");
    else {
      showToast("Transport charge deleted successfully.", "success");
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="Transport & Courier" subtitle="Record material transport and courier charges.">
        <button type="button" onClick={() => setAdding(true)} className="btn-primary"><Plus size={15} /> Add Charge</button>
      </PageHeader>
      <div className="list-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search description, provider or reference" />
      </div>
      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Date", "Type", "Description", "Provider", "Reference", "Amount ₹", ""]}>
            {loading ? <tr><Td colSpan={8} className="text-muted">Loading…</Td></tr> : data.length === 0 ? <tr><Td colSpan={8} className="text-muted">No transport charges found.</Td></tr> : data.map((charge, index) => (
              <tr key={charge.id}>
                <Td>{(page - 1) * pageSize + index + 1}</Td>
                <Td>{formatDate(charge.date)}</Td>
                <Td>{charge.charge_type}</Td>
                <Td>{charge.description}</Td>
                <Td>{charge.provider || "—"}</Td>
                <Td>{charge.reference_number || "—"}</Td>
                <Td className="num">{money(charge.amount)}</Td>
                <Td><button type="button" className="btn-icon text-danger" onClick={() => setDeleting(charge)} title="Delete charge"><Trash2 size={14} /></button></Td>
              </tr>
            ))}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>
      {adding && <TransportForm saving={saving} onSave={save} onClose={() => setAdding(false)} />}
      {deleting && <Modal title="Confirm Delete" onClose={() => setDeleting(null)}>
        <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>Delete this transport charge?</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={remove}>Delete Charge</button>
        </div>
      </Modal>}
    </div>
  );
}

function TransportForm({ saving, onSave, onClose }: { saving: boolean; onSave: (form: Omit<TransportCharge, "id" | "created_at">) => void; onClose: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [chargeType, setChargeType] = useState<TransportChargeType>("Material Transport");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const canSave = description.trim() && Number(amount) > 0;

  return <Modal title="Add Transport Charge" onClose={onClose}>
    <div className="form-grid-2">
      <Field label="Date" required><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Charge Type" required><select className="input" value={chargeType} onChange={(e) => setChargeType(e.target.value as TransportChargeType)}><option>Material Transport</option><option>Courier</option></select></Field>
      <Field label="Description" required><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Truck delivery to site" /></Field>
      <Field label="Provider"><input className="input" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Transporter or courier name" /></Field>
      <Field label="Reference Number"><input className="input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} /></Field>
      <Field label="Amount" required><input type="number" min="0" className="input" value={amount} onInput={normalizeNumberInputOnInput} onChange={(e) => setAmount(normalizeNumberInput(e.target.value))} /></Field>
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
      <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      <button type="button" className="btn-primary" disabled={!canSave || saving} onClick={() => onSave({ date, charge_type: chargeType, description: description.trim(), provider: provider.trim() || null, reference_number: referenceNumber.trim() || null, amount: Number(amount) })}>{saving ? "Saving…" : "Save Charge"}</button>
    </div>
  </Modal>;
}
