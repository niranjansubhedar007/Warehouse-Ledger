"use client";
import { useState, useMemo } from "react";
import { Modal, Field } from "@/components/ui";
import { normalizeNumberInput, normalizeNumberInputOnInput, money } from "@/lib/format";
import type { Item, BillLineInput, QuotationRow } from "@/lib/types";
import { Plus, Trash2 } from "@/components/icons";

interface BillFormProps {
  items: Item[];
  saving: boolean;
  editingQuotation?: QuotationRow;
  initialCustomer?: Partial<QuotationRow>;
  onSave: (mode: "quotation", doc: {
    id?: string;
    customerName: string;
    customerMobile: string;
    date: string;
    discount: number;
    tax: number;
    shippingCharge: number;
    lines: BillLineInput[];
  }) => Promise<boolean>;
  onClose: () => void;
}

export function BillForm({ items, onSave, onClose, saving, editingQuotation, initialCustomer }: BillFormProps) {
  const activeItems = useMemo(() => items.filter((i) => i.status === "Active"), [items]);

  const [customerName, setCustomerName] = useState(editingQuotation?.customer_name || initialCustomer?.customer_name || "");
  const [customerMobile, setCustomerMobile] = useState(editingQuotation?.customer_mobile || initialCustomer?.customer_mobile || "");
  const [date, setDate] = useState(editingQuotation?.date || initialCustomer?.date || new Date().toISOString().split("T")[0]);

  const [lines, setLines] = useState<BillLineInput[]>(() => {
    if (editingQuotation) {
      return editingQuotation.quotation_items.reduce<BillLineInput[]>((merged, item) => {
        const existing = merged.find((line) => line.item_id === item.item_id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          merged.push({
            item_id: item.item_id,
            quantity: item.quantity,
            selling_price: item.selling_price
          });
        }
        return merged;
      }, []);
    }
    const first = activeItems[0];
    return first ? [{ item_id: first.id, quantity: 1, selling_price: first.selling_price }] : [];
  });

  const [tax, setTax] = useState(editingQuotation?.tax || 0);
  const [shippingCharge, setShippingCharge] = useState(editingQuotation?.shipping_charge || 0);

  const addLine = () => {
    if (activeItems.length === 0) return;
    setLines((currentLines) => [
      ...currentLines,
      { item_id: "", quantity: 1, selling_price: 0 },
    ]);
  };
  const updateLine = (idx: number, patch: Partial<BillLineInput>) =>
    setLines((currentLines) => {
      const updatedLines = currentLines.map((line, lineIndex) =>
        lineIndex === idx ? { ...line, ...patch } : line
      );
      const changedLine = updatedLines[idx];
      if (!changedLine || !patch.item_id) return updatedLines;

      const duplicateIndex = updatedLines.findIndex(
        (line, lineIndex) => lineIndex !== idx && line.item_id === changedLine.item_id
      );
      if (duplicateIndex === -1) return updatedLines;

      return updatedLines
        .map((line, lineIndex) =>
          lineIndex === duplicateIndex
            ? { ...line, quantity: line.quantity + changedLine.quantity }
            : line
        )
        .filter((_, lineIndex) => lineIndex !== idx);
    });
  const removeLine = (idx: number) => setLines((l) => l.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, ln) => s + ln.quantity * ln.selling_price, 0);
  const grandTotal = subtotal + Number(tax || 0) + Number(shippingCharge || 0);

  // Calculate total requested per item to validate against stock correctly
  const requestedStock = lines.reduce((acc, ln) => {
    acc[ln.item_id] = (acc[ln.item_id] || 0) + ln.quantity;
    return acc;
  }, {} as Record<string, number>);

  const stockErrors = lines.map(ln => {
    const item = items.find(i => String(i.id) === String(ln.item_id));
    return item ? requestedStock[ln.item_id] > item.current_stock : false;
  });
  const hasStockError = stockErrors.some(err => err);

  const canSave = Boolean(customerName.trim()) && Boolean(customerMobile.trim()) && lines.length > 0 && lines.every((l) => Boolean(l.item_id) && l.quantity > 0) && !hasStockError;

  return (
    <Modal title={editingQuotation ? "Edit Quotation" : "New Quotation"} onClose={onClose} wide>
      <div style={{ padding: "8px 0" }}>
        <div className="form-grid-3" style={{ marginBottom: 24 }}>
          <Field label="Customer Name" required>
            <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>
          <Field label="Customer Mobile" required>
            <input
              type="tel"
              inputMode="numeric"
              className="input"
              maxLength={10}
              required
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
            />
          </Field>
          <Field label="Quotation Date" required>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="panel" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
          <div className="table-scroll" style={{ maxHeight: "350px", overflowY: "auto" }}>
            <table className="data-table bill-table">
              <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "var(--bg-main)", boxShadow: "0 1px 0 var(--border)" }}>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>Sr</th>
                  <th>Item</th>
                  <th style={{ width: 100 }}>Stock</th>
                  <th style={{ width: 100 }}>Qty</th>
                  <th style={{ width: 150 }}>Price</th>
                  <th style={{ width: 150, textAlign: 'right' }}>Amount</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody style={{ position: 'relative' }}>
                {lines.map((ln, idx) => {
                  const item = items.find(i => String(i.id) === String(ln.item_id));
                  const isOverstock = stockErrors[idx];
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{idx + 1}</td>
                      <td>
                        <select
                          className="input"
                          value={ln.item_id}
                          onChange={(e) => {
                            const selectedItem = activeItems.find(
                              (activeItem) => String(activeItem.id) === e.target.value
                            );
                            updateLine(idx, {
                              item_id: e.target.value,
                              selling_price: selectedItem?.selling_price ?? ln.selling_price,
                            });
                          }}
                        >
                          <option value="" disabled>Select an item</option>
                          {activeItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </td>
                      <td className="num" style={{ textAlign: 'center', color: isOverstock ? 'red' : 'inherit', fontWeight: isOverstock ? 600 : 400 }}>
                        {item?.current_stock || 0}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <input
                            type="number"
                            min="1"
                            className={`input ${isOverstock ? "text-danger" : ""}`}
                            value={ln.quantity}
                            onInput={normalizeNumberInputOnInput}
                            onChange={(e) => {
                              const val = Number(normalizeNumberInput(e.target.value) || 0);
                              updateLine(idx, { quantity: val < 1 ? 1 : val });
                            }}
                          />
                          {isOverstock && (
                            <span style={{ fontSize: 10, color: 'red', textAlign: 'center' }}>Too many!</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={ln.selling_price}
                          onInput={normalizeNumberInputOnInput}
                          onChange={(e) => updateLine(idx, { selling_price: Number(normalizeNumberInput(e.target.value) || 0) })}
                        />
                      </td>
                      <td className="strong num" style={{ textAlign: 'right' }}>{money(ln.quantity * ln.selling_price)}</td>
                      <td>
                        <button type="button" className="btn-icon text-danger" onClick={() => removeLine(idx)} title="Remove item">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-muted)" }}>
            <button type="button" className="btn-primary" style={{ padding: "6px 12px", width: "max-content", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }} onClick={addLine}>
              <Plus size={14} /> Add Item
            </button>
          </div>
        </div>

        <div className="form-grid-3" style={{ marginBottom: 24 }}>
          <Field label="Tax">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>₹</span>
              <input type="number" className="input" style={{ paddingLeft: 20 }} value={tax} onInput={normalizeNumberInputOnInput} onChange={(e) => setTax(Number(normalizeNumberInput(e.target.value) || 0))} />
            </div>
          </Field>
          <Field label="Shipping Charge">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>₹</span>
              <input type="number" className="input" style={{ paddingLeft: 20 }} value={shippingCharge} onInput={normalizeNumberInputOnInput} onChange={(e) => setShippingCharge(Number(normalizeNumberInput(e.target.value) || 0))} />
            </div>
          </Field>
        </div>

        <div className="panel" style={{ padding: 16, backgroundColor: "var(--bg-muted)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 40 }}>
            <div className="text-right">
              <div className="text-muted" style={{ fontSize: 13 }}>Subtotal</div>
              <div className="strong" style={{ fontSize: 16 }}>{money(subtotal)}</div>
            </div>
            <div className="text-right">
              <div className="text-muted" style={{ fontSize: 13 }}>Grand Total</div>
              <div className="strong" style={{ fontSize: 22, color: "var(--primary)", fontWeight: 700 }}>{money(grandTotal)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          <button onClick={onClose} className="btn-secondary" type="button" style={{ padding: "8px 20px" }}>Cancel</button>
          <button
            disabled={saving || !canSave}
            onClick={async () => {
              const success = await onSave("quotation", {
                id: editingQuotation?.id,
                customerName,
                customerMobile,
                date,
                discount: 0,
                tax,
                shippingCharge,
                lines,
              });
              if (success) onClose();
            }}
            className="btn-primary"
            type="button"
            style={{ padding: "8px 20px" }}
          >
            {saving ? "Saving…" : editingQuotation ? "Update Quotation" : "Create Quotation"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
