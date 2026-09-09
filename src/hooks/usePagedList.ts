"use client";
import { useMemo, useState } from "react";

export const PAGE_SIZE = 10;

export function usePagedList<T>(
  items: T[],
  matches: (item: T, query: string) => boolean,
  pageSize = PAGE_SIZE
) {
  const [query, setQueryRaw] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => matches(item, q));
  }, [items, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const setQuery = (q: string) => {
    setQueryRaw(q);
    setPage(1);
  };

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    totalPages,
    paged,
    totalCount: filtered.length,
    pageSize,
  };
}
