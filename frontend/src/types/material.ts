export type MaterialStatus = "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";

export type Material = {
  id: number;
  name: string;
  material_type: string;
  provider: string;
  quantity_available: string;
  minimum_stock: string;
  unit: string;
  unit_price: string;
  status: MaterialStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type MaterialPayload = {
  name: string;
  material_type: string;
  provider: string;
  quantity_available: string;
  minimum_stock: string;
  unit: string;
  unit_price: string;
  notes: string;
};

export type MaterialConsumption = {
  id: number;
  job: number;
  job_title: string;
  material: number;
  material_name: string;
  quantity: string;
  consumption_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type MaterialConsumptionPayload = {
  job: number;
  material: number;
  quantity: string;
  consumption_date: string;
  notes: string;
};