export const money = (n: number | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDate = (iso: string) => iso;
