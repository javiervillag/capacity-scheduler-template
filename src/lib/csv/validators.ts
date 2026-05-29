import type { JobStatus, ResourceType } from "@/lib/scheduling/types";

const resourceTypes = new Set<ResourceType>(["PERSON", "CREW", "EQUIPMENT", "SUBCONTRACTOR"]);
const jobStatuses = new Set<JobStatus>(["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]);

export function validateResourceRows(rows: Record<string, string>[]) {
  const errors: string[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    if (!row.name) errors.push(`Row ${index + 2}: name is required.`);
    if (!resourceTypes.has(row.type as ResourceType)) errors.push(`Row ${index + 2}: type is invalid.`);
    const key = `${row.name}:${row.type}`;
    if (seen.has(key)) errors.push(`Row ${index + 2}: duplicate resource name/type in CSV.`);
    seen.add(key);
  });

  return errors;
}

export function validateJobRows(rows: Record<string, string>[]) {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (!row.title) errors.push(`Row ${index + 2}: title is required.`);
    if (Number.isNaN(new Date(row.startsAt).getTime())) errors.push(`Row ${index + 2}: startsAt is invalid.`);
    if (Number.isNaN(new Date(row.endsAt).getTime())) errors.push(`Row ${index + 2}: endsAt is invalid.`);
    if (row.status && !jobStatuses.has(row.status as JobStatus)) errors.push(`Row ${index + 2}: status is invalid.`);
  });

  return errors;
}
