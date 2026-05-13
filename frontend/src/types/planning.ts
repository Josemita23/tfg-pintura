export type CalendarEventType = "VISIT" | "JOB" | "REMINDER";

export type CalendarEventStatus = "PLANNED" | "COMPLETED" | "CANCELLED";

export type CalendarEvent = {
  id: number;
  job: number | null;
  job_title: string | null;
  job_client_name: string | null;
  job_display_name: string;
  title: string;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  status: CalendarEventStatus;
  created_at: string;
  updated_at: string;
};

export type CalendarEventPayload = {
  job: number | null;
  title: string;
  event_type: CalendarEventType;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  status: CalendarEventStatus;
};