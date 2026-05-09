export type ClientStatus = "ACTIVE" | "INACTIVE" | "POTENTIAL";

export type Client = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
};