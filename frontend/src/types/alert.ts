export type AlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "JOB_REMINDER"
  | "OVERLAP"
  | "BUDGET_PENDING"
  | "GENERAL";

export type AlertPriority = "LOW" | "MEDIUM" | "HIGH";

export type Alert = {
  id: number;
  alert_type: AlertType;
  title: string;
  description: string;
  priority: AlertPriority;
  is_read: boolean;
  material: number | null;
  material_name: string | null;
  job: number | null;
  job_title: string | null;
  calendar_event: number | null;
  calendar_event_title: string | null;
  created_at: string;
  updated_at: string;
};