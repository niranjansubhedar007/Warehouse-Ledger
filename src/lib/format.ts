export const money = (n: number | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDate = (iso: string) => iso;

export const normalizeNumberInput = (value: string) => value.replace(/^0+(?=\d)/, "");

export const normalizeNumberInputOnInput = (event: { currentTarget: HTMLInputElement }) => {
  const input = event.currentTarget;
  const normalized = normalizeNumberInput(input.value);
  if (input.value !== normalized) input.value = normalized;
};
