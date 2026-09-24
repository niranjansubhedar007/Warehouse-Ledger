export type TransportChargeType = "Material Transport" | "Courier";

export interface TransportCharge {
  id: number;
  date: string;
  charge_type: TransportChargeType;
  description: string;
  provider: string | null;
  reference_number: string | null;
  amount: number;
  created_at: string;
}
