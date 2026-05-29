import type {
  SchedulableAssignment,
  SchedulableJob,
  SchedulableResource,
  ScheduleConflict
} from "./types";

const ignoredStatuses = new Set(["CANCELLED"]);

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function activeJob(job: SchedulableJob) {
  return !ignoredStatuses.has(job.status);
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

export function detectScheduleConflicts(
  resources: SchedulableResource[],
  jobs: SchedulableJob[],
  assignments: SchedulableAssignment[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const activeJobs = jobs.filter(activeJob);
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const assignmentsByJob = new Map<string, SchedulableAssignment[]>();
  const assignmentsByResource = new Map<string, SchedulableAssignment[]>();

  for (const assignment of assignments) {
    const job = jobById.get(assignment.jobId);
    if (!job || !activeJob(job)) continue;
    assignmentsByJob.set(assignment.jobId, [
      ...(assignmentsByJob.get(assignment.jobId) ?? []),
      assignment
    ]);
    assignmentsByResource.set(assignment.resourceId, [
      ...(assignmentsByResource.get(assignment.resourceId) ?? []),
      assignment
    ]);
  }

  for (const job of activeJobs) {
    const startsAt = asDate(job.startsAt);
    const endsAt = asDate(job.endsAt);
    const jobAssignments = assignmentsByJob.get(job.id) ?? [];

    if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      conflicts.push({
        type: "INVALID_TIME_RANGE",
        severity: "error",
        jobId: job.id,
        message: `${job.title} has an invalid start/end time.`
      });
    }

    if (jobAssignments.length === 0) {
      conflicts.push({
        type: "NO_ASSIGNMENTS",
        severity: "warning",
        jobId: job.id,
        message: `${job.title} has no assigned resources.`
      });
    }

    if (
      job.requiresEquipment &&
      !jobAssignments.some((assignment) => resourceById.get(assignment.resourceId)?.type === "EQUIPMENT")
    ) {
      conflicts.push({
        type: "MISSING_EQUIPMENT",
        severity: "error",
        jobId: job.id,
        message: `${job.title} requires equipment but none is assigned.`
      });
    }

    for (const assignment of jobAssignments) {
      const resource = resourceById.get(assignment.resourceId);
      if (resource && !resource.active) {
        conflicts.push({
          type: "INACTIVE_RESOURCE",
          severity: "error",
          jobId: job.id,
          resourceId: resource.id,
          message: `${resource.name} is inactive but assigned to ${job.title}.`
        });
      }
    }
  }

  for (const [resourceId, resourceAssignments] of assignmentsByResource.entries()) {
    const resource = resourceById.get(resourceId);
    if (!resource) continue;

    for (let i = 0; i < resourceAssignments.length; i += 1) {
      for (let j = i + 1; j < resourceAssignments.length; j += 1) {
        const firstJob = jobById.get(resourceAssignments[i].jobId);
        const secondJob = jobById.get(resourceAssignments[j].jobId);
        if (!firstJob || !secondJob || !activeJob(firstJob) || !activeJob(secondJob)) continue;

        if (
          rangesOverlap(
            asDate(firstJob.startsAt),
            asDate(firstJob.endsAt),
            asDate(secondJob.startsAt),
            asDate(secondJob.endsAt)
          )
        ) {
          conflicts.push({
            type: "DOUBLE_BOOKED_RESOURCE",
            severity: "error",
            resourceId,
            jobId: firstJob.id,
            relatedJobIds: [firstJob.id, secondJob.id],
            message: `${resource.name} is double-booked for ${firstJob.title} and ${secondJob.title}.`
          });
        }
      }
    }
  }

  return conflicts;
}
