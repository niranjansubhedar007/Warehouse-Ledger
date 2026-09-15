export type Role = "admin" | "staff";

export interface Profile {
  id: string;
  username: string | null;
  password_hash: string | null;
  role: Role;
  is_dark_mode: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  name: string;
  purchase_price: number;
  selling_price: number;
  shipping_weight: number;
  current_stock: number;
  low_stock_threshold: number;
  status: "Active" | "Inactive";
  created_at: string;
}

export interface Purchase {
  id: string;
  invoice_number: string;
  date: string;
  supplier: string;
  item_id: string;
  quantity: number;
  purchase_price: number;
  shipping_weight: number;
  total_amount: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  date: string;
  customer_name: string;
  customer_mobile: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping_charge: number;
  grand_total: number;
  status: "pending" | "done" | "rejected";
  created_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_id: string;
  quantity: number;
  selling_price: number;
  amount: number;
}

export interface QuotationWithItems extends Quotation {
  quotation_items: QuotationItem[];
}

export interface QuotationRow extends Quotation {
  quotation_items: {
    item_id: string;
    quantity: number;
    shipping_weight: number;
    selling_price: number;
    item_name: string;
  }[];
  sales?: { id: string; bill_number: string }[];
}

export interface Sale {

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
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  shipping_weight: number;
  amount: number;
  profit: number;
}

export interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
}

export interface StockTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  reference_id: string | null;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  created_at: string;
}

export interface BillLineInput {
  item_id: string;
  quantity: number;
  selling_price: number;
}

// Minimal Database type placeholder so `createBrowserClient<Database>` / server client
// type-check. Run `npx supabase gen types typescript` against your project for full,
// generated table types if you want end-to-end type safety later.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
