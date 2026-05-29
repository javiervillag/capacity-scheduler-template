import { detectScheduleConflicts } from "@/lib/scheduling/conflicts";
import type {
  SchedulableAssignment,
  SchedulableJob,
  SchedulableResource,
  JobStatus,
  ResourceType
} from "@/lib/scheduling/types";

export type DemoResource = SchedulableResource & {
  createdAt: string;
  updatedAt: string;
};

export type DemoJob = SchedulableJob & {
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoAssignment = SchedulableAssignment & {
  createdAt: string;
  job?: DemoJob;
  resource?: DemoResource;
};

type DemoStore = {
  resources: DemoResource[];
  jobs: DemoJob[];
  assignments: DemoAssignment[];
};

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const at = (date: string, hour: number) => `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;

function resource(name: string, type: ResourceType, extra: Partial<DemoResource> = {}): DemoResource {
  return {
    id: id("res"),
    name,
    type,
    active: true,
    tags: "",
    notes: "",
    createdAt: now(),
    updatedAt: now(),
    ...extra
  };
}

function job(title: string, startsAt: string, endsAt: string, extra: Partial<DemoJob> = {}): DemoJob {
  return {
    id: id("job"),
    title,
    projectRef: "",
    startsAt,
    endsAt,
    status: "SCHEDULED",
    workType: "",
    notes: "",
    requiresEquipment: false,
    createdAt: now(),
    updatedAt: now(),
    ...extra
  };
}

function buildSeed(): DemoStore {
  const crew = resource("Telcyte Construction Crew A", "CREW", { tags: "construction,in-house" });
  const rig = resource("Bore Rig 1", "EQUIPMENT", { tags: "boring,equipment" });
  const traffic = resource("Traffic Control Partner", "SUBCONTRACTOR", { tags: "tcp,trax,traffic" });
  const inactive = resource("Inactive Bucket Truck", "EQUIPMENT", { active: false, tags: "equipment,inactive" });
  const techs = Array.from({ length: 40 }, (_, index) =>
    resource(`Barker Technician ${String(index + 1).padStart(2, "0")}`, "PERSON", {
      tags: index % 3 === 0 ? "plumbing" : index % 3 === 1 ? "drains" : "install"
    })
  );

  const jobs = [
    job("CX Vault Lid Replacement", at("2026-06-02", 8), at("2026-06-02", 16), {
      projectRef: "CX-1042",
      workType: "Work Notification / TCP",
      requiresEquipment: true
    }),
    job("CX Fiber Storage Dig Down", at("2026-06-02", 12), at("2026-06-02", 18), {
      projectRef: "CX-1043",
      workType: "Construction",
      requiresEquipment: true
    }),
    job("Aerial Pull Transfer", at("2026-06-03", 8), at("2026-06-03", 14), {
      projectRef: "CX-1044",
      workType: "Aerial",
      requiresEquipment: true
    }),
    job("Unassigned Work Notification", at("2026-06-04", 9), at("2026-06-04", 12), {
      projectRef: "CX-1045",
      workType: "Work Notification"
    }),
    job("Barker Monthly Route - Plumbing", at("2026-06-05", 8), at("2026-06-05", 17), {
      projectRef: "BARKER-JUNE",
      workType: "Technician Shift"
    }),
    job("Barker Emergency Coverage", at("2026-06-05", 13), at("2026-06-05", 18), {
      projectRef: "BARKER-JUNE",
      workType: "Technician Shift"
    })
  ];

  const assignments = [
    assign(jobs[0], crew, "Crew"),
    assign(jobs[0], rig, "Equipment"),
    assign(jobs[0], traffic, "Traffic"),
    assign(jobs[1], crew, "Crew"),
    assign(jobs[1], rig, "Equipment"),
    assign(jobs[2], inactive, "Equipment"),
    assign(jobs[4], techs[0], "Technician"),
    assign(jobs[4], techs[1], "Technician"),
    assign(jobs[5], techs[0], "Technician"),
    assign(jobs[5], techs[2], "Technician")
  ];

  return { resources: [crew, rig, traffic, inactive, ...techs], jobs, assignments };
}

function assign(jobItem: DemoJob, resourceItem: DemoResource, role: string): DemoAssignment {
  return {
    id: id("asg"),
    jobId: jobItem.id,
    resourceId: resourceItem.id,
    role,
    createdAt: now()
  };
}

const globalForDemo = globalThis as unknown as { capacityDemoStore?: DemoStore };

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function demoStore() {
  globalForDemo.capacityDemoStore ??= buildSeed();
  return globalForDemo.capacityDemoStore;
}

export function demoSnapshot() {
  const store = demoStore();
  const jobsById = new Map(store.jobs.map((jobItem) => [jobItem.id, jobItem]));
  const resourcesById = new Map(store.resources.map((resourceItem) => [resourceItem.id, resourceItem]));
  const assignments = store.assignments.map((assignmentItem) => ({
    ...assignmentItem,
    job: jobsById.get(assignmentItem.jobId),
    resource: resourcesById.get(assignmentItem.resourceId)
  }));
  return {
    resources: store.resources,
    jobs: store.jobs,
    assignments,
    conflicts: detectScheduleConflicts(store.resources, store.jobs, store.assignments)
  };
}

export function createDemoResource(input: { name: string; type: ResourceType; active?: boolean; tags?: string; notes?: string }) {
  const created = resource(input.name, input.type, {
    active: input.active ?? true,
    tags: input.tags ?? "",
    notes: input.notes ?? ""
  });
  demoStore().resources.push(created);
  return created;
}

export function createDemoJob(input: {
  title: string;
  projectRef?: string;
  startsAt: string;
  endsAt: string;
  status?: JobStatus;
  workType?: string;
  notes?: string;
  requiresEquipment?: boolean;
}) {
  const created = job(input.title, input.startsAt, input.endsAt, {
    projectRef: input.projectRef ?? "",
    status: input.status ?? "SCHEDULED",
    workType: input.workType ?? "",
    notes: input.notes ?? "",
    requiresEquipment: input.requiresEquipment ?? false
  });
  demoStore().jobs.push(created);
  return created;
}

export function createDemoAssignment(input: { jobId: string; resourceId: string; role?: string }) {
  const created: DemoAssignment = {
    id: id("asg"),
    jobId: input.jobId,
    resourceId: input.resourceId,
    role: input.role ?? "",
    createdAt: now()
  };
  demoStore().assignments.push(created);
  return demoSnapshot().assignments.find((assignmentItem) => assignmentItem.id === created.id) ?? created;
}

export function updateDemoJob(jobId: string, input: Partial<DemoJob>) {
  const store = demoStore();
  const index = store.jobs.findIndex((jobItem) => jobItem.id === jobId);
  if (index === -1) throw new Error("Job not found.");
  store.jobs[index] = { ...store.jobs[index], ...input, updatedAt: now() };
  return store.jobs[index];
}
