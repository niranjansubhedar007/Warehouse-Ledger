"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, money } from "@/lib/format";
import { useParams } from "next/navigation";

export default function QuotationView() {
  const supabase = createClient();
  const params = useParams();
  const [q, setQ] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotation() {
      const { data, error } = await supabase
        .from("quotations")
        .select("*, quotation_items(*, items(name))")
        .eq("id", params.id)
        .single();

      if (!error && data) setQ(data);
      setLoading(false);
    }
    fetchQuotation();
  }, [params.id, supabase]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading quotation...</div>;
  if (!q) return <div style={{ padding: 40, textAlign: "center" }}>Quotation not found.</div>;

  const itemsHtml = q.quotation_items.map((it: any, idx: number) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.items?.name || 'Unknown Item'}</td>
      <td style="text-align: center;">${it.quantity}</td>
      <td style="text-align: right;">${money(it.selling_price)}</td>
      <td style="text-align: right;">${money(it.quantity * it.selling_price)}</td>
    </tr>
  `).join("");

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { padding: 0 !important; }
          @page { margin: 10mm; }
        }
        .print-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          color: #333;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #444; padding-bottom: 20px; }
        .company-info h1 { margin: 0; color: #000; font-size: 28px; text-transform: uppercase; }
        .company-info p { margin: 2px 0; font-size: 14px; color: #666; }
        .doc-title { text-align: right; }
        .doc-title h2 { margin: 0; color: #444; font-size: 24px; }
        .doc-title p { margin: 2px 0; font-size: 14px; }
        .client-info { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .client-info div p { margin: 5px 0; font-size: 15px; }
        .client-info .label { font-weight: bold; color: #666; width: 100px; display: inline-block; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #f8f9fa; color: #333; font-weight: 600; padding: 12px 8px; border: 1px solid #dee2e6; text-align: left; font-size: 14px; }
        td { padding: 10px 8px; border: 1px solid #dee2e6; font-size: 14px; }
        .totals-section { display: flex; justify-content: flex-end; }
        .totals-table { width: 250px; border-collapse: collapse; }
        .totals-table td { padding: 8px; border: none; font-size: 14px; }
        .totals-table .label { text-align: right; color: #666; }
        .totals-table .value { text-align: right; font-weight: 600; }
        .grand-total-row { background-color: #f8f9fa; font-weight: bold; font-size: 16px; }
        .print-btn {
          position: fixed; top: 20px; right: 20px;
          padding: 10px 20px; background: #000; color: #fff;
          border: none; border-radius: 4px; cursor: pointer; font-weight: 600;
        }
      `}} />

      <button className="print-btn no-print" onClick={() => window.print()}>
        Download PDF / Print
      </button>

      <div className="header">
        <div className="company-info">
          <h1>YEZDIWALA SPARE MAFIA</h1>
          <p>+91 8623898172</p>
        </div>
        <div className="doc-title">
          <h2>QUOTATION</h2>
          <p><strong>No:</strong> {q.quotation_number}</p>
          <p><strong>Date:</strong> {formatDate(q.date)}</p>
        </div>
      </div>

      <div className="client-info">
        <div>
          <p><span className="label">Customer Name:</span> {q.customer_name}</p>
          <p><span className="label">Customer Mobile:</span> {q.customer_mobile || 'N/A'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '50px', textAlign: 'center' }}>Sr</th>
            <th>Item Description</th>
            <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '120px', textAlign: 'right' }}>Price</th>
            <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody dangerouslySetInnerHTML={{ __html: itemsHtml }} />
      </table>

      <div className="totals-section">
        <table className="totals-table">
          <tr>
            <td className="label">Subtotal:</td>
            <td className="value">{money(q.subtotal)}</td>
          </tr>
          {q.discount > 0 && (
            <tr>
              <td className="label">Discount:</td>
              <td className="value">-{money(q.discount)}</td>
            </tr>
          )}
          {q.tax > 0 && (
            <tr>
              <td className="label">Tax:</td>
              <td className="value">{money(q.tax)}</td>
            </tr>
          )}
          {q.shipping_charge > 0 && (
            <tr>
              <td className="label">Shipping:</td>
              <td className="value">{money(q.shipping_charge)}</td>
            </tr>
          )}
          <tr className="grand-total-row">
            <td className="label">Grand Total:</td>
            <td className="value">{money(q.grand_total)}</td>
          </tr>
        </table>
      </div>
    </div>
  );
}
