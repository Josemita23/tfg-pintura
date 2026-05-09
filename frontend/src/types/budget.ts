export type BudgetStatus = "DRAFT" | "PENDING" | "ACCEPTED" | "REJECTED" | "CONVERTED";

export type Budget = {
  id: number;
  client: number;
  client_name: string;
  code: string;
  description: string;
  date: string;
  status: BudgetStatus;
  subtotal: string;
  vat_percentage: string;
  vat_amount: string;
  total: string;
  notes: string;
  created_at: string;
  updated_at: string;
};