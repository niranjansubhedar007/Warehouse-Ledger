"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Item, BillLineInput, QuotationRow } from "@/lib/types";
import { useServerPagedList } from "@/hooks/useServerPagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, SearchBar, Pagination, Modal, Field } from "@/components/ui";
import { formatDate, money } from "@/lib/format";
import { Plus, CheckCircle, Clock, FileText, Download, X, Eye, Pencil } from "@/components/icons";
import { BillForm } from "./BillForm";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SaleRow {
  id: string;
  bill_number: string;
  date: string;
  customer_name: string;
  customer_mobile: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping_charge: number;
  grand_total: number;
  sale_items: { item_id: string; quantity: number; shipping_weight: number; selling_price: number; item_name: string }[];
}

export function SalesClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QuotationRow | null>(null);
  const [viewing, setViewing] = useState<QuotationRow | null>(null);
  const [viewingType, setViewingType] = useState<"quotation" | "bill">("quotation");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"quotations" | "bills">("quotations");
  const [quotationStatus, setQuotationStatus] = useState<"" | "pending" | "done" | "rejected">("");
  const [quotationStartDate, setQuotationStartDate] = useState("");
  const [quotationEndDate, setQuotationEndDate] = useState("");

  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<{ modalTitle: string; title: string; onConfirm: () => void } | null>(null);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) showToast(error.message);
    else setItems(data as Item[]);
  }, [supabase, showToast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const loadSalesPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase.from("sales").select("id, bill_number, date, customer_name, customer_mobile, subtotal, discount, tax, shipping_charge, grand_total, sale_items(quantity, selling_price, item_id, items(name))", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + 9);
    if (query.trim()) request = request.or(`bill_number.ilike.%${query.trim()}%,customer_name.ilike.%${query.trim()}%,customer_mobile.ilike.%${query.trim()}%`);
    const { data, error, count } = await request;
    if (error) showToast(error.message, "error");
    if (data) {
      const flatItems = data.flatMap(s => s.sale_items);
      const itemIds = flatItems.map(i => i.item_id);
      const { data: itemDetails } = await supabase.from("items").select("id, name, shipping_weight").in("id", itemIds);
      const itemMap = new Map(itemDetails?.map(i => [i.id, i]) || []);
      const enrichedData = data.map(s => ({
        ...s,
        sale_items: s.sale_items.map(i => ({
          ...i,
          shipping_weight: itemMap.get(i.item_id)?.shipping_weight || 0,
          item_name: itemMap.get(i.item_id)?.name || i.items?.[0]?.name || `Item ${i.item_id}`
        }))
      }));
      return { data: enrichedData as unknown as SaleRow[], total: count || 0 };
    }
    return { data: [] as unknown as SaleRow[], total: count || 0 };
  }, [supabase, showToast]);

  const salesList = useServerPagedList(loadSalesPage);
  const { data: sales, loading: salesLoading, reload: reloadSales, query: salesQuery, setQuery: setSalesQuery, page: salesPage, setPage: setSalesPage, totalPages: salesTotalPages, totalCount: salesTotalCount, pageSize: salesPageSize } = salesList;

  const loadQuotationsPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase.from("quotations").select("id, quotation_number, date, customer_name, customer_mobile, subtotal, discount, tax, shipping_charge, grand_total, status, quotation_items(quantity, selling_price, item_id, items(name)), sales(id, bill_number)", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + 9);
    if (query.trim()) request = request.or(`quotation_number.ilike.%${query.trim()}%,customer_name.ilike.%${query.trim()}%,customer_mobile.ilike.%${query.trim()}%`);
    if (quotationStatus) request = request.eq("status", quotationStatus);
    if (quotationStartDate) request = request.gte("date", quotationStartDate);
    if (quotationEndDate) request = request.lte("date", quotationEndDate);
    const { data, error, count } = await request;
    if (error) showToast(error.message, "error");
    if (data) {
      const flatItems = data.flatMap(q => q.quotation_items);
      const itemIds = flatItems.map(i => i.item_id);
      const { data: itemDetails } = await supabase.from("items").select("id, name, shipping_weight").in("id", itemIds);
      const itemMap = new Map(itemDetails?.map(i => [i.id, i]) || []);
      const enrichedData = data.map(q => ({
        ...q,
        quotation_items: q.quotation_items.map(i => ({
          ...i,
          shipping_weight: itemMap.get(i.item_id)?.shipping_weight || 0,
          item_name: itemMap.get(i.item_id)?.name || i.items?.[0]?.name || `Item ${i.item_id}`
        }))
      }));
      return { data: enrichedData as unknown as QuotationRow[], total: count || 0 };
    }
    return { data: [] as unknown as QuotationRow[], total: count || 0 };
  }, [supabase, showToast, quotationStatus, quotationStartDate, quotationEndDate]);

  const quotationsList = useServerPagedList(loadQuotationsPage);
  const { data: quotations, loading: quotesLoading, reload: reloadQuotes, query: quotesQuery, setQuery: setQuotesQuery, page: quotesPage, setPage: setQuotesPage, totalPages: quotesTotalPages, totalCount: quotesTotalCount, pageSize: quotesPageSize } = quotationsList;

  const saveDocument = async (mode: "quotation", doc: {
    id?: string;
    customerName: string;
    customerMobile: string;
    date: string;
    discount: number;
    tax: number;
    shippingCharge: number;
    lines: BillLineInput[];
  }) => {
    setSaving(true);
    let error;
    if (doc.id) {
      const { error: updateError } = await supabase.rpc("update_quotation", {
        p_quotation_id: doc.id,
        p_customer_name: doc.customerName,
        p_customer_mobile: doc.customerMobile || null,
        p_date: doc.date,
        p_discount: doc.discount,
        p_tax: doc.tax,
        p_shipping_charge: doc.shippingCharge,
        p_items: doc.lines,
      });
      error = updateError;
    } else {
      const { error: createError } = await supabase.rpc("create_quotation", {
        p_customer_name: doc.customerName,
        p_customer_mobile: doc.customerMobile || null,
        p_date: doc.date,
        p_discount: doc.discount,
        p_tax: doc.tax,
        p_shipping_charge: doc.shippingCharge,
        p_items: doc.lines,
      });
      error = createError;
    }
    setSaving(false);
    if (error) { showToast(error.message); return false; }
    showToast(doc.id ? "Quotation updated successfully." : "Quotation created successfully.", "success");
    reloadQuotes();
    setCreating(false);
    setEditing(null);
    return true;
  };

  const updateQuotationStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("quotations").update({ status: newStatus }).eq("id", id);
    if (error) showToast(error.message, "error");
    else {
      showToast(`Quotation marked as ${newStatus}.`, "success");
      reloadQuotes();
    }
  };

  const convertToBill = async (id: string) => {
    const { error } = await supabase.rpc("convert_quotation_to_sale", { p_quotation_id: id });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Converted to bill successfully and stock updated.", "success");
      reloadQuotes();
      reloadSales();
    }
  };

  const downloadPDF = (q: QuotationRow, documentTitle = "QUOTATION", filePrefix = "quotation") => {
    const doc = new jsPDF();
    const pdfMoney = (amount: number) => money(amount).replace("₹", "Rs. ");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const navy: [number, number, number] = [19, 42, 76];
    const accent: [number, number, number] = [32, 117, 157];
    const muted: [number, number, number] = [94, 106, 120];
    const light: [number, number, number] = [244, 247, 250];
    const isBill = documentTitle === "BILL";
    const left = 16;
    const right = pageWidth - 16;

    // Branded header.
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 37, "F");
    doc.setFillColor(...accent);
    doc.rect(0, 34, pageWidth, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("YEZDIWALA SPARE MAFIA", left, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Genuine parts. Trusted service.", left, 24);
    doc.text("+91 8623898172", left, 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(documentTitle, right, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(documentTitle === "BILL" ? "FINAL SALES INVOICE" : "OFFICIAL PRICE PROPOSAL", right, 25, { align: "right" });

    // Quotation and customer summary cards.
    doc.setTextColor(35, 45, 58);
    doc.setFillColor(...light);
    doc.roundedRect(left, 45, pageWidth - 32, 25, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(documentTitle === "BILL" ? "BILL NUMBER" : "QUOTATION NUMBER", left + 7, 53);
    doc.text("ISSUE DATE", 88, 53);
    doc.text("CUSTOMER", 137, 53);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...navy);
    doc.text(q.quotation_number, left + 7, 62);
    doc.text(formatDate(q.date), 88, 62);
    doc.text(q.customer_name, 137, 62, { maxWidth: 52 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`Mobile: ${q.customer_mobile || "N/A"}`, 137, 68);

    autoTable(doc, {
      startY: 76,
      margin: { left, right: 16 },
      head: [["SR", "ITEM DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
      body: q.quotation_items.map((item, index) => [
        index + 1,
        item.item_name,
        item.quantity,
        pdfMoney(item.selling_price),
        pdfMoney(item.quantity * item.selling_price),
      ]),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: [48, 58, 70],
        cellPadding: { top: 1.8, right: 5, bottom: 1.8, left: 5 },
        lineColor: [220, 226, 232],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: navy,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: { top: 2.5, right: 5, bottom: 2.5, left: 5 },
      },
      alternateRowStyles: { fillColor: [249, 251, 253] },
      columnStyles: {
        0: { halign: "center", cellWidth: 14 },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "right", cellWidth: 34 },
        4: { halign: "right", cellWidth: 36 },
      },
      didDrawCell: (data) => {
        if (data.section === "body") {
          doc.setDrawColor(225, 230, 235);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      },
    });

    const finalY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 76) + 5;
    const totals = [
      ["Subtotal", pdfMoney(q.subtotal)],
      ...(q.tax > 0 ? [["Tax", pdfMoney(q.tax)]] : []),
      ...(q.shipping_charge > 0 ? [["Shipping", pdfMoney(q.shipping_charge)]] : []),
      ["Grand Total", pdfMoney(q.grand_total)],
    ];
    autoTable(doc, {
      startY: finalY,
      body: totals,
      theme: "plain",
      tableWidth: 82,
      margin: { left: right - 82 },
      styles: { font: "helvetica", fontSize: 8, textColor: [65, 75, 88], cellPadding: 1.5 },
      columnStyles: { 0: { halign: "right", cellWidth: 43 }, 1: { halign: "right", cellWidth: 39 } },
      didParseCell: (data) => {
        if (data.row.index === totals.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = navy;
          data.cell.styles.fillColor = [232, 242, 247];
          data.cell.styles.cellPadding = 3;
        }
      },
    });

    const totalsY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || finalY) + 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...navy);
    doc.text(isBill ? "BILL TERMS & NOTES" : "QUOTATION TERMS & NOTES", left, totalsY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      isBill
        ? "Thank you for your purchase. This bill confirms the items and amounts supplied."
        : "Thank you for your business. Please confirm the quotation before placing your order.",
      left,
      totalsY + 5
    );
    doc.text(
      isBill
        ? "Please retain this bill for your records."
        : "Prices and availability are subject to confirmation at the time of order.",
      left,
      totalsY + 10
    );

    doc.setDrawColor(220, 226, 232);
    doc.line(left, pageHeight - 22, right, pageHeight - 22);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text("YEZDIWALA SPARE MAFIA", left, pageHeight - 14);
    doc.text(q.quotation_number, right, pageHeight - 14, { align: "right" });
    doc.setFontSize(7);
    doc.save(`${filePrefix}-${q.quotation_number}.pdf`);
  };

  const downloadBillPDF = (s: SaleRow) => {
    const billData = {
      ...s,
      quotation_number: s.bill_number,
      quotation_items: s.sale_items,
      status: "done" as const,
      created_at: "",
    };
    downloadPDF(billData, "BILL", "bill");
  };

  const viewBill = (s: SaleRow) => {
    setViewingType("bill");
    setViewing({
      id: s.id,
      quotation_number: s.bill_number,
      date: s.date,
      customer_name: s.customer_name,
      customer_mobile: s.customer_mobile,
      subtotal: s.subtotal,
      discount: s.discount,
      tax: s.tax,
      shipping_charge: s.shipping_charge,
      grand_total: s.grand_total,
      status: "done",
      created_at: "",
      quotation_items: s.sale_items,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="tab-row bordered">
        {([
          ["quotations", "Quotations"],
          ["bills", "Bills"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`tab ${activeTab === k ? "active" : ""}`}
          >
            {l}
          </button>
        ))}
      </div>

      {activeTab === "quotations" ? (
        <section>
          <PageHeader title="Quotations" subtitle="Create quotations first. Mark as 'Done' to convert to a Bill.">
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus size={15} /> New Quotation
            </button>
          </PageHeader>
          <div className="list-toolbar quotation-toolbar">
            <SearchBar value={quotesQuery} onChange={setQuotesQuery} placeholder="Search quotation no or customer" />
            <select
              className="input"
              value={quotationStatus}
              onChange={(event) => {
                setQuotationStatus(event.target.value as typeof quotationStatus);
                setQuotesPage(1);
              }}
              aria-label="Filter quotations by status"
              style={{ maxWidth: 180 }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="date-field">
              <input type="date" className="input" value={quotationStartDate} max={quotationEndDate || undefined} onChange={(event) => { setQuotationStartDate(event.target.value); setQuotesPage(1); }} aria-label="Quotation start date" />
            </div>
            <div className="date-field">
              <input type="date" className="input" value={quotationEndDate} min={quotationStartDate || undefined} onChange={(event) => { setQuotationEndDate(event.target.value); setQuotesPage(1); }} aria-label="Quotation end date" />
            </div>
          </div>
          <div className="panel">
            <div className="table-scroll">
              <Table headers={["Sr", "No", "Date", "Customer", "Status", "Tax", "Shipping", "Grand Total", "Actions"]}>
                {quotesLoading ? (
                  <tr><Td colSpan={9} className="text-muted">Loading…</Td></tr>
                ) : quotations.length === 0 ? (
                  <tr><Td colSpan={9} className="text-muted">No quotations match your search.</Td></tr>
                ) : (
                  quotations.map((q, idx) => (
                    <tr key={q.id}>
                      <Td>{(quotesPage - 1) * quotesPageSize + idx + 1}</Td>
                      <Td className="mono">{q.quotation_number}</Td>
                      <Td>{formatDate(q.date)}</Td>
                      <Td>{q.customer_name}</Td>
                      <Td>
                        <span style={{
                          color: q.sales?.length ? "#166534" : q.status === "rejected" ? "#991b1b" : q.status === "done" ? "#166534" : "#854d0e",
                          fontWeight: "600",
                          fontSize: 14
                        }}>
                          {q.sales?.length ? "Ready" : q.status}
                        </span>
                      </Td>
                      <Td className="num">{money(q.tax)}</Td>
                      <Td className="num">{money(q.shipping_charge)}</Td>
                      <Td className="strong num">{money(q.grand_total)}</Td>
                      <Td>
                        {q.status === "rejected" ? (
                          <span className="text-muted" style={{ fontSize: 12 }}>No actions available</span>
                        ) : q.sales?.length ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setViewingType("quotation"); setViewing(q); }}>
                              <Eye size={14} /> View
                            </button>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => downloadPDF(q, "BILL", "bill")}>
                              <Download size={14} /> PDF
                            </button>
                             <span style={{ alignSelf: "center", color: "#166534", fontSize: 12, fontWeight: 600 }}>
                              Quotation created
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => { setViewingType("quotation"); setViewing(q); }}>
                              <Eye size={14} /> View
                            </button>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setEditing(q)}>
                              <Pencil size={14} /> Edit
                            </button>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => downloadPDF(q)}>
                              <Download size={14} /> PDF
                            </button>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setConfirmAction({ modalTitle: "Update Status", title: `Mark as ${q.status === "pending" ? "Done" : "Pending"}?`, onConfirm: () => updateQuotationStatus(q.id, q.status === "pending" ? "done" : "pending") })}>
                              {q.status === "pending" ? <><CheckCircle size={14} /> Done</> : <><Clock size={14} /> Pending</>}
                            </button>
                            <button className="btn-secondary text-danger" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setConfirmAction({ modalTitle: "Reject Quotation", title: "Reject this quotation?", onConfirm: () => updateQuotationStatus(q.id, "rejected") })}>
                              <X size={14} /> Reject
                            </button>
                            {q.status === "done" && (
                              <button className="btn-primary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setConfirmAction({ modalTitle: "Convert to Bill", title: "Convert this quotation to a final bill?", onConfirm: () => convertToBill(q.id) })}>
                                <FileText size={14} /> Create Bill
                              </button>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
            <Pagination page={quotesPage} totalPages={quotesTotalPages} totalCount={quotesTotalCount} pageSize={quotesPageSize} onChange={setQuotesPage} />
          </div>
        </section>
      ) : (
        <section>
          <PageHeader title="Billing" subtitle="List of finalized bills.">
          </PageHeader>
          <div className="list-toolbar">
            <SearchBar value={salesQuery} onChange={setSalesQuery} placeholder="Search bill no or customer" />
          </div>
          <div className="panel">
            <div className="table-scroll">
              <Table headers={["Sr", "Bill No", "Date", "Customer", "Items", "Weight", "Subtotal", "Grand Total", "Actions"]}>
                {salesLoading ? (
                  <tr><Td colSpan={9} className="text-muted">Loading…</Td></tr>
                ) : sales.length === 0 ? (
                  <tr><Td colSpan={9} className="text-muted">No bills match your search.</Td></tr>
                ) : (
                  sales.map((s, idx) => {
                    const totalWeight = s.sale_items.reduce((a, l) => a + Number(l.shipping_weight), 0);
                    return (
                      <tr key={s.id}>
                        <Td>{(salesPage - 1) * salesPageSize + idx + 1}</Td>
                        <Td className="mono">{s.bill_number}</Td>
                        <Td>{formatDate(s.date)}</Td>
                        <Td>{s.customer_name}</Td>
                        <Td className="num">{s.sale_items.length}</Td>
                        <Td className="num">{totalWeight.toFixed(2)} kg</Td>
                        <Td className="num">{money(s.subtotal)}</Td>
                        <Td className="strong num">{money(Math.abs(Number(s.grand_total)))}</Td>
                        <Td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => viewBill(s)}
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => downloadBillPDF(s)}
                            >
                              <Download size={14} />  PDF
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </Table>
            </div>
            <Pagination page={salesPage} totalPages={salesTotalPages} totalCount={salesTotalCount} pageSize={salesPageSize} onChange={setSalesPage} />
          </div>
        </section>
      )}

      {creating && <BillForm items={items} saving={saving} onSave={saveDocument} onClose={() => setCreating(false)} />}
      {editing && <BillForm items={items} saving={saving} editingQuotation={editing} onSave={saveDocument} onClose={() => setEditing(null)} />}
      {viewing && (
        <Modal title={`View ${viewingType === "bill" ? "Bill" : "Quotation"} ${viewing.quotation_number}`} onClose={() => setViewing(null)} wide>
          <div style={{ padding: "10px 0" }}>
            <div className="form-grid-3" style={{ marginBottom: 20 }}>
              <Field label="Customer Name">
                <div className="strong">{viewing.customer_name}</div>
              </Field>
              <Field label="Mobile">
                <div>{viewing.customer_mobile || "N/A"}</div>
              </Field>
              <Field label="Date">
                <div>{formatDate(viewing.date)}</div>
              </Field>
            </div>

            <div className="panel" style={{ maxHeight: "300px", overflowY: "auto" }}>
              <div className="table-scroll">
                <Table headers={["Sr", "Item", "Qty", "Price", "Amount"]}>
                  {viewing.quotation_items.map((it, idx) => (
                    <tr key={idx}>
                      <Td>{idx + 1}</Td>
                      <Td>{it.item_name}</Td>
                      <Td className="num">{it.quantity}</Td>
                      <Td className="num">{money(it.selling_price)}</Td>
                      <Td className="strong num">{money(it.quantity * it.selling_price)}</Td>
                    </tr>
                  ))}
                </Table>
              </div>
            </div>

            <div className="totals-row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4 }}>
                <div>Subtotal: <span className="strong num">{money(viewing.subtotal)}</span></div>
                <div>Tax: <span className="strong num">{money(viewing.tax)}</span></div>
                <div>Shipping: <span className="strong num">{money(viewing.shipping_charge)}</span></div>
                <div style={{ fontSize: 18, marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  Grand Total: <span className="strong num" style={{ color: "var(--primary)" }}>{money(viewing.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <Modal title={confirmAction.modalTitle} onClose={() => setConfirmAction(null)}>
          <p style={{ margin: "0 0 20px", color: "var(--text-dim)", fontSize: 13 }}>
            {confirmAction.title}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => {
              confirmAction.onConfirm();
              setConfirmAction(null);
            }}>Confirm</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
