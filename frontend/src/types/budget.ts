export type BudgetStatus = "DRAFT" | "PENDING" | "ACCEPTED" | "REJECTED" | "CONVERTED";

export type BudgetItem = {
  id: number;
  budget: number;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  amount: string;
  created_at: string;
  updated_at: string;
};

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
  items?: BudgetItem[];
  created_at: string;
  updated_at: string;
};