export type JobStatus = "PENDING" | "PLANNED" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

export type Job = {
  id: number;
  client: number;
  client_name: string;
  budget: number | null;
  budget_code: string | null;
  title: string;
  description: string;
  address: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: JobStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};