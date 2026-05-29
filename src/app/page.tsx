"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScheduleConflict } from "@/lib/scheduling/types";

type ResourceType = "PERSON" | "CREW" | "EQUIPMENT" | "SUBCONTRACTOR";
type JobStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";

type Resource = {
  id: string;
  name: string;
  type: ResourceType;
  active: boolean;
  tags: string;
  notes: string;
};

type Job = {
  id: string;
  title: string;
  projectRef: string;
  startsAt: string;
  endsAt: string;
  status: JobStatus;
  workType: string;
  notes: string;
  requiresEquipment: boolean;
};

type Assignment = {
  id: string;
  jobId: string;
  resourceId: string;
  role: string;
  job?: Job;
  resource?: Resource;
};

type AppData = {
  resources: Resource[];
  jobs: Job[];
  assignments: Assignment[];
  conflicts: ScheduleConflict[];
};

type DrawerMode = "resource" | "job" | "assign" | "job-detail" | "resource-detail" | null;
type Tab = "Dashboard" | "Month" | "Week" | "Resources" | "Conflicts" | "Import/Export";

const emptyData: AppData = { resources: [], jobs: [], assignments: [], conflicts: [] };
const tabs: Tab[] = ["Dashboard", "Month", "Week", "Resources", "Conflicts", "Import/Export"];
const statuses: JobStatus[] = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"];
const resourceTypes: ResourceType[] = ["PERSON", "CREW", "EQUIPMENT", "SUBCONTRACTOR"];
const resourceLabels: Record<ResourceType, string> = {
  PERSON: "Person",
  CREW: "Crew",
  EQUIPMENT: "Equipment",
  SUBCONTRACTOR: "Subcontractor"
};

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function inputFromIso(value: string) {
  return localInputValue(new Date(value));
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function displayDay(value: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(value);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function jobDurationMs(job: Job) {
  return Math.max(60 * 60 * 1000, new Date(job.endsAt).getTime() - new Date(job.startsAt).getTime());
}

function moveJobToDate(job: Job, date: Date) {
  const currentStart = new Date(job.startsAt);
  const startsAt = new Date(date);
  startsAt.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);
  if (Number.isNaN(startsAt.getTime())) startsAt.setHours(8, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + jobDurationMs(job));
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

function monthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function weekDays(anchor: Date) {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function Home() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [message, setMessage] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [resourceForm, setResourceForm] = useState({ name: "", type: "PERSON" as ResourceType, tags: "", notes: "", active: true });
  const [jobForm, setJobForm] = useState({
    title: "",
    projectRef: "",
    startsAt: localInputValue(new Date(Date.now() + 3_600_000)),
    endsAt: localInputValue(new Date(Date.now() + 7_200_000)),
    status: "SCHEDULED" as JobStatus,
    workType: "",
    requiresEquipment: false,
    notes: ""
  });
  const [assignmentForm, setAssignmentForm] = useState({
    jobId: "",
    resourceType: "PERSON" as ResourceType | "ALL",
    resourceIds: [] as string[],
    role: ""
  });
  const [csvImport, setCsvImport] = useState("name,type\nExample Tech,PERSON\nExample Bad Row,NOPE");
  const [csvEntity, setCsvEntity] = useState("resources");

  async function refresh() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    const nextData = await response.json();
    setData(nextData);
    if (nextData.jobs.length && data.jobs.length === 0) {
      setViewDate(new Date(nextData.jobs[0].startsAt));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedJob = data.jobs.find((job) => job.id === selectedJobId);
  const selectedResource = data.resources.find((resource) => resource.id === selectedResourceId);

  const assignmentsByJob = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    data.assignments.forEach((assignment) => {
      map.set(assignment.jobId, [...(map.get(assignment.jobId) ?? []), assignment]);
    });
    return map;
  }, [data.assignments]);

  const jobsByResource = useMemo(() => {
    const map = new Map<string, Job[]>();
    data.assignments.forEach((assignment) => {
      const job = data.jobs.find((item) => item.id === assignment.jobId);
      if (job) map.set(assignment.resourceId, [...(map.get(assignment.resourceId) ?? []), job]);
    });
    return map;
  }, [data.assignments, data.jobs]);

  const selectedJobResources = selectedJob ? assignmentsByJob.get(selectedJob.id) ?? [] : [];
  const filteredResources = assignmentForm.resourceType === "ALL"
    ? data.resources
    : data.resources.filter((resource) => resource.type === assignmentForm.resourceType);

  function openDrawer(mode: DrawerMode) {
    setDrawerMode(mode);
    setMessage("");
  }

  function openJob(job: Job) {
    setSelectedJobId(job.id);
    setJobForm({
      title: job.title,
      projectRef: job.projectRef,
      startsAt: inputFromIso(job.startsAt),
      endsAt: inputFromIso(job.endsAt),
      status: job.status,
      workType: job.workType,
      requiresEquipment: job.requiresEquipment,
      notes: job.notes
    });
    openDrawer("job-detail");
  }

  function openResource(resource: Resource) {
    setSelectedResourceId(resource.id);
    setResourceForm({
      name: resource.name,
      type: resource.type,
      active: resource.active,
      tags: resource.tags,
      notes: resource.notes
    });
    openDrawer("resource-detail");
  }

  async function submitResource(event: React.FormEvent) {
    event.preventDefault();
    const isEdit = drawerMode === "resource-detail" && selectedResourceId;
    const response = await fetch(isEdit ? `/api/resources/${selectedResourceId}` : "/api/resources", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(resourceForm)
    });
    setMessage(response.ok ? (isEdit ? "Resource updated." : "Resource created.") : "Resource could not be saved.");
    if (response.ok) {
      if (!isEdit) setResourceForm({ name: "", type: "PERSON", active: true, tags: "", notes: "" });
      await refresh();
    }
  }

  async function submitJob(event: React.FormEvent) {
    event.preventDefault();
    const isEdit = drawerMode === "job-detail" && selectedJobId;
    const response = await fetch(isEdit ? `/api/jobs/${selectedJobId}` : "/api/jobs", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...jobForm,
        startsAt: new Date(jobForm.startsAt).toISOString(),
        endsAt: new Date(jobForm.endsAt).toISOString()
      })
    });
    setMessage(response.ok ? (isEdit ? "Job updated." : "Job created.") : "Job could not be saved.");
    if (response.ok) {
      const saved = await response.json();
      if (!isEdit) {
        setSelectedJobId(saved.id);
        setAssignmentForm({ ...assignmentForm, jobId: saved.id });
      }
      await refresh();
    }
  }

  async function submitAssignment(event: React.FormEvent) {
    event.preventDefault();
    const jobId = assignmentForm.jobId || selectedJobId;
    if (!jobId || assignmentForm.resourceIds.length === 0) {
      setMessage("Choose a job and at least one resource.");
      return;
    }

    const existing = new Set((assignmentsByJob.get(jobId) ?? []).map((assignment) => assignment.resourceId));
    const resourceIds = assignmentForm.resourceIds.filter((resourceId) => !existing.has(resourceId));
    if (resourceIds.length === 0) {
      setMessage("Those resources are already assigned.");
      return;
    }

    const results = await Promise.all(
      resourceIds.map((resourceId) =>
        fetch("/api/assignments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobId, resourceId, role: assignmentForm.role })
        })
      )
    );
    const ok = results.every((response) => response.ok);
    setMessage(ok ? "Resources assigned." : "Some resources could not be assigned.");
    if (ok) {
      setAssignmentForm({ ...assignmentForm, resourceIds: [] });
      await refresh();
    }
  }

  async function updateJobDates(job: Job, startsAt: string, endsAt: string) {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startsAt, endsAt })
    });
    setMessage("Schedule updated.");
    await refresh();
  }

  async function dropJobOnDay(event: React.DragEvent, date: Date) {
    event.preventDefault();
    const jobId = event.dataTransfer.getData("text/plain");
    const job = data.jobs.find((item) => item.id === jobId);
    if (!job) return;
    const dates = moveJobToDate(job, date);
    await updateJobDates(job, dates.startsAt, dates.endsAt);
  }

  async function resolveConflict(conflict: ScheduleConflict) {
    if (!conflict.relatedJobIds || conflict.relatedJobIds.length < 2) return;
    const first = data.jobs.find((job) => job.id === conflict.relatedJobIds?.[0]);
    const second = data.jobs.find((job) => job.id === conflict.relatedJobIds?.[1]);
    if (!first || !second) return;

    const startsAt = new Date(first.endsAt);
    const endsAt = new Date(startsAt.getTime() + jobDurationMs(second));
    await updateJobDates(second, startsAt.toISOString(), endsAt.toISOString());
  }

  async function submitImport(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/csv/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity: csvEntity, csv: csvImport })
    });
    const result = await response.json();
    setImportErrors(result.errors ?? []);
    setMessage(response.ok ? `Imported ${result.imported} rows.` : "Import needs fixes.");
    if (response.ok) await refresh();
  }

  const metrics = [
    { label: "Jobs this month", value: data.jobs.filter((job) => new Date(job.startsAt).getMonth() === viewDate.getMonth()).length, tab: "Month" as Tab },
    { label: "Open conflicts", value: data.conflicts.length, tab: "Conflicts" as Tab, tone: data.conflicts.length ? "bad" as const : "good" as const },
    { label: "Unassigned jobs", value: data.conflicts.filter((conflict) => conflict.type === "NO_ASSIGNMENTS").length, tab: "Conflicts" as Tab },
    { label: "Active resources", value: data.resources.filter((resource) => resource.active).length, tab: "Resources" as Tab },
    { label: "Equipment booked", value: bookedEquipment(data), tab: "Resources" as Tab }
  ];

  return (
    <main className="min-h-screen bg-panel">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
          <button className="text-left" onClick={() => setActiveTab("Dashboard")}>
            <p className="text-sm font-semibold text-accent">Capacity Scheduler</p>
            <h1 className="text-2xl font-bold text-ink">Internal scheduling and capacity planning</h1>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2" aria-label="Views">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`focus-ring rounded border px-3 py-2 text-sm font-semibold ${
                    activeTab === tab ? "border-accent bg-accent text-white" : "border-line bg-white text-ink"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-accent" onClick={() => openDrawer("resource")}>
                New Resource
              </button>
              <button className="focus-ring rounded bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={() => openDrawer("job")}>
                New Job
              </button>
              <button className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-accent" onClick={() => openDrawer("assign")}>
                Assign
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-5 py-5">
        {message && (
          <div className="rounded border border-line bg-white px-4 py-3 text-sm font-semibold text-accent" role="status">
            {message}
          </div>
        )}

        {activeTab === "Dashboard" && (
          <section className="space-y-5" data-testid="dashboard-view">
            <div className="grid gap-3 md:grid-cols-5">
              {metrics.map((metric) => (
                <Metric key={metric.label} {...metric} onClick={() => setActiveTab(metric.tab)} />
              ))}
            </div>
            <JobList title="Upcoming schedule" jobs={data.jobs.slice(0, 8)} assignmentsByJob={assignmentsByJob} onOpenJob={openJob} />
          </section>
        )}

        {activeTab === "Month" && (
          <CalendarBoard
            title="Month calendar"
            mode="month"
            viewDate={viewDate}
            setViewDate={setViewDate}
            jobs={data.jobs}
            assignmentsByJob={assignmentsByJob}
            onOpenJob={openJob}
            onDropJob={dropJobOnDay}
          />
        )}

        {activeTab === "Week" && (
          <CalendarBoard
            title="Week calendar"
            mode="week"
            viewDate={viewDate}
            setViewDate={setViewDate}
            jobs={data.jobs}
            assignmentsByJob={assignmentsByJob}
            onOpenJob={openJob}
            onDropJob={dropJobOnDay}
          />
        )}

        {activeTab === "Resources" && (
          <ResourceView resources={data.resources} jobsByResource={jobsByResource} onOpenResource={openResource} />
        )}

        {activeTab === "Conflicts" && (
          <ConflictView conflicts={data.conflicts} onResolve={resolveConflict} />
        )}

        {activeTab === "Import/Export" && (
          <ImportExport
            csvEntity={csvEntity}
            setCsvEntity={setCsvEntity}
            csvImport={csvImport}
            setCsvImport={setCsvImport}
            importErrors={importErrors}
            onSubmit={submitImport}
          />
        )}
      </div>

      {drawerMode && (
        <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setDrawerMode(null)}>
          <aside className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {drawerMode === "resource" && "Create resource"}
                {drawerMode === "resource-detail" && "Edit resource"}
                {drawerMode === "job" && "Create job"}
                {drawerMode === "job-detail" && "Job details"}
                {drawerMode === "assign" && "Assign resources"}
              </h2>
              <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold" onClick={() => setDrawerMode(null)}>
                Close
              </button>
            </div>

            {(drawerMode === "resource" || drawerMode === "resource-detail") && (
              <ResourceForm form={resourceForm} setForm={setResourceForm} onSubmit={submitResource} isEdit={drawerMode === "resource-detail"} />
            )}

            {(drawerMode === "job" || drawerMode === "job-detail") && (
              <div className="space-y-5">
                <JobForm form={jobForm} setForm={setJobForm} onSubmit={submitJob} isEdit={drawerMode === "job-detail"} />
                {drawerMode === "job-detail" && selectedJob && (
                  <AssignedResources
                    assignments={selectedJobResources}
                    openAssign={() => {
                      setAssignmentForm({ ...assignmentForm, jobId: selectedJob.id, resourceIds: [] });
                      setDrawerMode("assign");
                    }}
                  />
                )}
              </div>
            )}

            {drawerMode === "assign" && (
              <AssignForm
                jobs={data.jobs}
                resources={filteredResources}
                allResources={data.resources}
                form={assignmentForm}
                setForm={setAssignmentForm}
                onSubmit={submitAssignment}
              />
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value, tone, onClick }: { label: string; value: number; tone?: "good" | "bad"; onClick: () => void }) {
  return (
    <button className="focus-ring rounded border border-line bg-white p-4 text-left transition hover:border-accent" onClick={onClick}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone === "bad" ? "text-rose" : tone === "good" ? "text-mint" : "text-ink"}`}>{value}</p>
    </button>
  );
}

function Field({ label, value, onChange, testId, type = "text" }: { label: string; value: string; onChange: (value: string) => void; testId?: string; type?: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="mt-1 w-full rounded border border-line p-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} />
    </label>
  );
}

function JobList({ title, jobs, assignmentsByJob, onOpenJob }: { title: string; jobs: Job[]; assignmentsByJob: Map<string, Assignment[]>; onOpenJob: (job: Job) => void }) {
  return (
    <section className="rounded border border-line bg-white p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} assignments={assignmentsByJob.get(job.id) ?? []} onOpen={() => onOpenJob(job)} />
        ))}
      </div>
    </section>
  );
}

function JobCard({ job, assignments, onOpen, draggable = false }: { job: Job; assignments: Assignment[]; onOpen: () => void; draggable?: boolean }) {
  return (
    <button
      className="focus-ring w-full rounded border border-line bg-white p-3 text-left transition hover:border-accent"
      draggable={draggable}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", job.id)}
      onClick={onOpen}
      data-testid={`job-card-${job.title}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{job.title}</h3>
          <p className="text-sm text-slate-600">{displayDate(job.startsAt)} - {displayDate(job.endsAt)}</p>
        </div>
        <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{job.status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {assignments.map((assignment) => `${assignment.resource?.name ?? assignment.resourceId}${assignment.resource?.type ? ` (${resourceLabels[assignment.resource.type]})` : ""}`).join(", ") || "No resources assigned"}
      </p>
    </button>
  );
}

function CalendarBoard({
  title,
  mode,
  viewDate,
  setViewDate,
  jobs,
  assignmentsByJob,
  onOpenJob,
  onDropJob
}: {
  title: string;
  mode: "month" | "week";
  viewDate: Date;
  setViewDate: (date: Date) => void;
  jobs: Job[];
  assignmentsByJob: Map<string, Assignment[]>;
  onOpenJob: (job: Job) => void;
  onDropJob: (event: React.DragEvent, date: Date) => void;
}) {
  const days = mode === "month" ? monthDays(viewDate) : weekDays(viewDate);
  const jump = mode === "month" ? 30 : 7;

  return (
    <section className="rounded border border-line bg-white p-4" data-testid={mode === "month" ? "month-view" : "week-view"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-slate-600">Drag jobs between days to reschedule.</p>
        </div>
        <div className="flex gap-2">
          <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - jump))}>Previous</button>
          <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold" onClick={() => setViewDate(new Date())}>Today</button>
          <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + jump))}>Next</button>
        </div>
      </div>
      <div className={`mt-4 grid gap-2 ${mode === "month" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-1 lg:grid-cols-7"}`}>
        {days.map((day) => {
          const dayJobs = jobs.filter((job) => sameDay(new Date(job.startsAt), day));
          const outsideMonth = mode === "month" && day.getMonth() !== viewDate.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`min-h-40 rounded border p-2 ${outsideMonth ? "border-slate-200 bg-slate-50" : "border-line bg-panel"}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropJob(event, day)}
              data-testid={`calendar-day-${day.toISOString().slice(0, 10)}`}
            >
              <p className="mb-2 text-xs font-bold text-slate-600">{displayDay(day)}</p>
              <div className="space-y-2">
                {dayJobs.map((job) => (
                  <JobCard key={job.id} job={job} assignments={assignmentsByJob.get(job.id) ?? []} onOpen={() => onOpenJob(job)} draggable />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResourceView({ resources, jobsByResource, onOpenResource }: { resources: Resource[]; jobsByResource: Map<string, Job[]>; onOpenResource: (resource: Resource) => void }) {
  return (
    <section className="rounded border border-line bg-white p-4" data-testid="resource-view">
      <h2 className="text-lg font-bold">Resource database</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {resources.map((resource) => {
          const jobs = jobsByResource.get(resource.id) ?? [];
          return (
            <button key={resource.id} className="focus-ring rounded border border-line p-3 text-left transition hover:border-accent" onClick={() => onOpenResource(resource)}>
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-bold">{resource.name}</h3>
                <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{resourceLabels[resource.type]}</span>
              </div>
              <p className="text-sm text-slate-600">{resource.active ? "Active" : "Inactive"} {resource.tags ? `- ${resource.tags}` : ""}</p>
              <p className="mt-2 text-sm">{jobs.map((job) => job.title).join(", ") || "No assignments"}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConflictView({ conflicts, onResolve }: { conflicts: ScheduleConflict[]; onResolve: (conflict: ScheduleConflict) => void }) {
  return (
    <section className="rounded border border-line bg-white p-4" data-testid="conflict-view">
      <h2 className="text-lg font-bold">Open conflicts</h2>
      <div className="mt-4 grid gap-3">
        {conflicts.length === 0 && <p className="rounded border border-line p-4 text-sm text-mint">No conflicts found.</p>}
        {conflicts.map((conflict, index) => (
          <article key={`${conflict.type}-${index}`} className="rounded border border-line p-3">
            <p className={`text-sm font-bold ${conflict.severity === "error" ? "text-rose" : "text-amber"}`}>{conflict.type}</p>
            <p className="mt-1 text-sm">{conflict.message}</p>
            {conflict.type === "DOUBLE_BOOKED_RESOURCE" && (
              <button className="focus-ring mt-3 rounded border border-line px-3 py-2 text-sm font-semibold text-accent" onClick={() => onResolve(conflict)} data-testid="resolve-conflict">
                Move second job after first
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ImportExport({
  csvEntity,
  setCsvEntity,
  csvImport,
  setCsvImport,
  importErrors,
  onSubmit
}: {
  csvEntity: string;
  setCsvEntity: (value: string) => void;
  csvImport: string;
  setCsvImport: (value: string) => void;
  importErrors: string[];
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <section className="rounded border border-line bg-white p-4" data-testid="import-export-view">
      <h2 className="text-lg font-bold">Import and export</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {["resources", "jobs", "assignments"].map((entity) => (
          <a key={entity} className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold text-accent" href={`/api/csv/export?entity=${entity}`} data-testid={`export-${entity}`}>
            Export {entity}
          </a>
        ))}
      </div>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm font-semibold">
          Import type
          <select className="mt-1 w-full rounded border border-line p-2" value={csvEntity} onChange={(event) => setCsvEntity(event.target.value)}>
            <option value="resources">Resources</option>
            <option value="jobs">Jobs</option>
            <option value="assignments">Assignments</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          CSV
          <textarea className="mt-1 min-h-36 w-full rounded border border-line p-2 font-mono text-sm" value={csvImport} onChange={(event) => setCsvImport(event.target.value)} data-testid="csv-input" />
        </label>
        <button className="focus-ring rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
          Validate and import
        </button>
      </form>
      {importErrors.length > 0 && (
        <ul className="mt-4 rounded border border-rose bg-white p-3 text-sm text-rose" data-testid="import-errors">
          {importErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResourceForm({ form, setForm, onSubmit, isEdit }: { form: { name: string; type: ResourceType; active: boolean; tags: string; notes: string }; setForm: (value: { name: string; type: ResourceType; active: boolean; tags: string; notes: string }) => void; onSubmit: (event: React.FormEvent) => void; isEdit: boolean }) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} testId="resource-name" />
      <label className="block text-sm font-semibold">
        Type
        <select className="mt-1 w-full rounded border border-line p-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ResourceType })} data-testid="resource-type">
          {resourceTypes.map((type) => <option key={type} value={type}>{resourceLabels[type]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
        Active
      </label>
      <Field label="Tags / skills" value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
      <label className="block text-sm font-semibold">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded border border-line p-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
        {isEdit ? "Save resource" : "Add resource"}
      </button>
    </form>
  );
}

function JobForm({ form, setForm, onSubmit, isEdit }: { form: { title: string; projectRef: string; startsAt: string; endsAt: string; status: JobStatus; workType: string; requiresEquipment: boolean; notes: string }; setForm: (value: { title: string; projectRef: string; startsAt: string; endsAt: string; status: JobStatus; workType: string; requiresEquipment: boolean; notes: string }) => void; onSubmit: (event: React.FormEvent) => void; isEdit: boolean }) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} testId="job-title" />
      <Field label="Project ref" value={form.projectRef} onChange={(projectRef) => setForm({ ...form, projectRef })} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Start" type="datetime-local" value={form.startsAt} onChange={(startsAt) => setForm({ ...form, startsAt })} testId="job-start" />
        <Field label="End" type="datetime-local" value={form.endsAt} onChange={(endsAt) => setForm({ ...form, endsAt })} testId="job-end" />
      </div>
      <label className="block text-sm font-semibold">
        Status
        <select className="mt-1 w-full rounded border border-line p-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as JobStatus })}>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <Field label="Work type" value={form.workType} onChange={(workType) => setForm({ ...form, workType })} />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={form.requiresEquipment} onChange={(event) => setForm({ ...form, requiresEquipment: event.target.checked })} />
        Requires equipment
      </label>
      <label className="block text-sm font-semibold">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded border border-line p-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
        {isEdit ? "Save job" : "Add job"}
      </button>
    </form>
  );
}

function AssignForm({ jobs, resources, allResources, form, setForm, onSubmit }: { jobs: Job[]; resources: Resource[]; allResources: Resource[]; form: { jobId: string; resourceType: ResourceType | "ALL"; resourceIds: string[]; role: string }; setForm: (value: { jobId: string; resourceType: ResourceType | "ALL"; resourceIds: string[]; role: string }) => void; onSubmit: (event: React.FormEvent) => void }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-semibold">
        Job
        <select className="mt-1 w-full rounded border border-line p-2" value={form.jobId} onChange={(event) => setForm({ ...form, jobId: event.target.value })} data-testid="assign-job">
          <option value="">Choose a job</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Resource type
        <select className="mt-1 w-full rounded border border-line p-2" value={form.resourceType} onChange={(event) => setForm({ ...form, resourceType: event.target.value as ResourceType | "ALL", resourceIds: [] })} data-testid="assign-resource-type">
          <option value="ALL">All types</option>
          {resourceTypes.map((type) => <option key={type} value={type}>{resourceLabels[type]}</option>)}
        </select>
      </label>
      <div className="rounded border border-line p-3">
        <p className="mb-2 text-sm font-semibold">Resources</p>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {resources.map((resource) => (
            <label key={resource.id} className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.resourceIds.includes(resource.id)}
                onChange={(event) => {
                  const resourceIds = event.target.checked
                    ? [...form.resourceIds, resource.id]
                    : form.resourceIds.filter((id) => id !== resource.id);
                  setForm({ ...form, resourceIds });
                }}
                data-testid={`assign-resource-${resource.name}`}
              />
              <span className="font-semibold">{resource.name}</span>
              <span className="text-slate-500">({resourceLabels[resource.type]})</span>
            </label>
          ))}
        </div>
        <select className="sr-only" data-testid="assign-resource" value={form.resourceIds[0] ?? ""} onChange={(event) => setForm({ ...form, resourceIds: event.target.value ? [event.target.value] : [] })}>
          <option value="">Choose a resource</option>
          {allResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
        </select>
      </div>
      <Field label="Role" value={form.role} onChange={(role) => setForm({ ...form, role })} />
      <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
        Assign selected resources
      </button>
    </form>
  );
}

function AssignedResources({ assignments, openAssign }: { assignments: Assignment[]; openAssign: () => void }) {
  return (
    <section className="rounded border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">Assigned resources</h3>
        <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold text-accent" onClick={openAssign}>
          Add resources
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {assignments.length === 0 && <p className="text-sm text-slate-600">No resources assigned.</p>}
        {assignments.map((assignment) => (
          <p key={assignment.id} className="rounded bg-panel px-3 py-2 text-sm">
            <span className="font-semibold">{assignment.resource?.name ?? assignment.resourceId}</span>
            {assignment.resource?.type && <span className="text-slate-600"> ({resourceLabels[assignment.resource.type]})</span>}
          </p>
        ))}
      </div>
    </section>
  );
}

function bookedEquipment(data: AppData) {
  const equipmentIds = new Set(data.resources.filter((resource) => resource.type === "EQUIPMENT").map((resource) => resource.id));
  return new Set(data.assignments.filter((assignment) => equipmentIds.has(assignment.resourceId)).map((assignment) => assignment.resourceId)).size;
}
