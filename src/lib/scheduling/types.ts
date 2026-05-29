export type ResourceType = "PERSON" | "CREW" | "EQUIPMENT" | "SUBCONTRACTOR";

export type JobStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type SchedulableResource = {
  id: string;
  name: string;
  type: ResourceType;
  active: boolean;
  tags?: string;
  notes?: string;
};

export type SchedulableJob = {
  id: string;
  title: string;
  projectRef?: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: JobStatus;
  workType?: string;
  notes?: string;
  requiresEquipment: boolean;
};

export type SchedulableAssignment = {
  id: string;
  jobId: string;
  resourceId: string;
  role?: string;
};

export type ScheduleConflict = {
  type:
    | "DOUBLE_BOOKED_RESOURCE"
    | "NO_ASSIGNMENTS"
    | "MISSING_EQUIPMENT"
    | "INACTIVE_RESOURCE"
    | "INVALID_TIME_RANGE";
  severity: "error" | "warning";
  message: string;
  jobId?: string;
  resourceId?: string;
  relatedJobIds?: string[];
};
