"use client";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerPagedList } from "@/hooks/useServerPagedList";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, Table, Td, SearchBar, Pagination, Badge } from "@/components/ui";
import { formatDate, money } from "@/lib/format";

export function QuotationReportClient() {
  const supabase = createClient();
  const showToast = useToast();
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadPage = useCallback(async (page: number, query: string) => {
    const from = (page - 1) * 10;
    let request = supabase
      .from("quotations")
      .select("id, quotation_number, date, customer_name, subtotal, tax, shipping_charge, grand_total, status", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + 9);

    if (query.trim()) {
      request = request.or(`quotation_number.ilike.%${query.trim()}%,customer_name.ilike.%${query.trim()}%`);
    }
    if (status) request = request.eq("status", status);
    if (startDate) request = request.gte("date", startDate);
    if (endDate) request = request.lte("date", endDate);

    const { data, error, count } = await request;
    if (error) showToast(error.message, "error");
    return { data: (data || []), total: count || 0 };
  }, [supabase, showToast, status, startDate, endDate]);

  const list = useServerPagedList(loadPage);
  const { data, loading, query, setQuery, page, setPage, totalPages, totalCount, pageSize } = list;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Quotation Report" subtitle="Comprehensive list of all quotations generated." />

      <div className="list-toolbar quotation-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search quotation no or customer" />
        <select className="input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter quotation report by status" style={{ maxWidth: 180 }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="date-field">
          <input
            type="date"
            className="input"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => { setStartDate(event.target.value); setPage(1); }}
            aria-label="Quotation report start date"
          />
        </div>
        <div className="date-field">
          <input
            type="date"
            className="input"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => { setEndDate(event.target.value); setPage(1); }}
            aria-label="Quotation report end date"
          />
        </div>
      </div>

      <div className="panel">
        <div className="table-scroll">
          <Table headers={["Sr", "Quotation No", "Date", "Customer", "Subtotal", "Tax", "Shipping", "Grand Total", "Status"]}>
            {loading ? (
              <tr><Td colSpan={9} className="text-muted">Loading…</Td></tr>
            ) : data.length === 0 ? (
              <tr><Td colSpan={9} className="text-muted">No quotations found.</Td></tr>
            ) : (
              data.map((q: any, idx: number) => (
                <tr key={q.id}>
                  <Td>{(page - 1) * pageSize + idx + 1}</Td>
                  <Td className="mono">{q.quotation_number}</Td>
                  <Td>{formatDate(q.date)}</Td>
                  <Td>{q.customer_name}</Td>
                  <Td className="num">{money(q.subtotal)}</Td>
                  <Td className="num">{money(q.tax)}</Td>
                  <Td className="num">{money(q.shipping_charge)}</Td>
                  <Td className="strong num">{money(q.grand_total)}</Td>
                  <Td>
                    <Badge active={q.status === "done"}>{q.status}</Badge>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}
