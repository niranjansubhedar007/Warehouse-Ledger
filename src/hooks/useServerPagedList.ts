import { useCallback, useEffect, useState } from "react";

export const SERVER_PAGE_SIZE = 10;

type Loader<T> = (page: number, query: string) => Promise<{ data: T[]; total: number }>;

export function useServerPagedList<T>(loader: Loader<T>, dependencies: unknown[] = []) {
  const [query, setQueryValue] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const totalPages = Math.max(1, Math.ceil(total / SERVER_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const reload = useCallback(() => {
    setLoading(true);
    return loader(safePage, query).then((result) => {
      setData(result.data);
      setTotal(result.total);
      setLoading(false);
    });
  }, [loader, safePage, query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      loader(safePage, query).then((result) => {
        if (!active) return;
        setData(result.data);
        setTotal(result.total);
        setLoading(false);
      }).catch(() => {
        if (active) setLoading(false);
      });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [loader, safePage, query, ...dependencies]);

  const setQuery = (value: string) => {
    setQueryValue(value);
    setPage(1);
  };

  return {
    data,
    loading,
    reload,
    query,
    setQuery,
    page: safePage,
    setPage,
    totalPages,
    totalCount: total,
    pageSize: SERVER_PAGE_SIZE,
  };
}
