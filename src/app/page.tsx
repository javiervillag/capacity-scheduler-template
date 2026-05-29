"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScheduleConflict } from "@/lib/scheduling/types";

type ResourceType = "PERSON" | "CREW" | "EQUIPMENT" | "SUBCONTRACTOR";
type JobStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
type Workspace = "schedule" | "resources" | "data";
type CalendarMode = "month" | "week";
type DrawerMode = "resource" | "job" | "assign" | "job-detail" | "resource-detail" | "docs" | null;

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

const emptyData: AppData = { resources: [], jobs: [], assignments: [], conflicts: [] };
const workspaces: Array<{ id: Workspace; label: string }> = [
  { id: "schedule", label: "Schedule" },
  { id: "resources", label: "Resources" },
  { id: "data", label: "Data" }
];
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

function displayMonth(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(value);
}

function displayTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
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

function formatConflictType(type: ScheduleConflict["type"]) {
  return type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function conflictTone(conflicts: ScheduleConflict[]) {
  if (conflicts.some((conflict) => conflict.severity === "error")) return "error";
  if (conflicts.length > 0) return "warning";
  return "clear";
}

function conflictLabel(conflicts: ScheduleConflict[]) {
  if (conflicts.length === 0) return "";
  return conflicts.length === 1 ? formatConflictType(conflicts[0].type) : `${conflicts.length} conflicts`;
}

function conflictClasses(conflicts: ScheduleConflict[]) {
  const tone = conflictTone(conflicts);
  if (tone === "error") return "border-rose bg-rose/5";
  if (tone === "warning") return "border-amber bg-amber/5";
  return "border-line bg-white";
}

function conflictBadgeClasses(conflicts: ScheduleConflict[]) {
  const tone = conflictTone(conflicts);
  if (tone === "error") return "bg-rose text-white";
  if (tone === "warning") return "bg-amber text-white";
  return "bg-panel text-ink";
}

function uniqueConflicts(conflicts: ScheduleConflict[]) {
  const seen = new Set<string>();
  return conflicts.filter((conflict) => {
    const key = `${conflict.type}-${conflict.jobId ?? ""}-${conflict.resourceId ?? ""}-${conflict.relatedJobIds?.join(",") ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Home() {
  const [data, setData] = useState<AppData>(emptyData);
  const [workspace, setWorkspace] = useState<Workspace>("schedule");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [ready, setReady] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState("");
  const [message, setMessage] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [resourceFilter, setResourceFilter] = useState<ResourceType | "ALL">("ALL");
  const [csvImport, setCsvImport] = useState("name,type\nExample Tech,PERSON\nExample Bad Row,NOPE");
  const [csvEntity, setCsvEntity] = useState("resources");
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

  async function refresh() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    const nextData = await response.json();
    setData(nextData);
    setReady(true);
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

  const conflictsByJob = useMemo(() => {
    const map = new Map<string, ScheduleConflict[]>();
    data.conflicts.forEach((conflict) => {
      const jobIds = new Set<string>();
      if (conflict.jobId) jobIds.add(conflict.jobId);
      conflict.relatedJobIds?.forEach((jobId) => jobIds.add(jobId));
      jobIds.forEach((jobId) => {
        map.set(jobId, [...(map.get(jobId) ?? []), conflict]);
      });
    });
    return map;
  }, [data.conflicts]);

  const filteredResources = resourceFilter === "ALL"
    ? data.resources
    : data.resources.filter((resource) => resource.type === resourceFilter);
  const assignmentResources = assignmentForm.resourceType === "ALL"
    ? data.resources
    : data.resources.filter((resource) => resource.type === assignmentForm.resourceType);
  const selectedJobResources = selectedJob ? assignmentsByJob.get(selectedJob.id) ?? [] : [];
  const selectedJobConflicts = selectedJob ? conflictsByJob.get(selectedJob.id) ?? [] : [];
  const upcomingJobs = data.jobs
    .filter((job) => new Date(job.endsAt).getTime() >= startOfDay(new Date()).getTime())
    .slice(0, 8);
  const blockingConflicts = data.conflicts.filter((conflict) => conflict.severity === "error");
  const unassignedCount = data.conflicts.filter((conflict) => conflict.type === "NO_ASSIGNMENTS").length;
  const activeResources = data.resources.filter((resource) => resource.active).length;

  function openDrawer(mode: DrawerMode) {
    if (!ready) return;
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

  function showIssue(conflict: ScheduleConflict) {
    const job = data.jobs.find((item) => item.id === conflict.jobId || conflict.relatedJobIds?.includes(item.id));
    if (job) openJob(job);
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
      setViewDate(new Date(saved.startsAt));
      setCalendarMode("month");
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

  async function deleteAssignment(assignmentId: string) {
    const response = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
    setMessage(response.ok ? "Assignment removed." : "Assignment could not be removed.");
    if (response.ok) await refresh();
  }

  async function deleteSelectedJob() {
    if (!selectedJobId || !window.confirm("Delete this job and its assignments?")) return;
    const response = await fetch(`/api/jobs/${selectedJobId}`, { method: "DELETE" });
    setMessage(response.ok ? "Job deleted." : "Job could not be deleted.");
    if (response.ok) {
      setDrawerMode(null);
      setSelectedJobId("");
      await refresh();
    }
  }

  async function deleteSelectedResource() {
    if (!selectedResourceId || !window.confirm("Delete this resource and remove it from assigned jobs?")) return;
    const response = await fetch(`/api/resources/${selectedResourceId}`, { method: "DELETE" });
    setMessage(response.ok ? "Resource deleted." : "Resource could not be deleted.");
    if (response.ok) {
      setDrawerMode(null);
      setSelectedResourceId("");
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
    const jobId = event.dataTransfer.getData("text/plain") || draggedJobId;
    const job = data.jobs.find((item) => item.id === jobId);
    if (!job) return;
    const dates = moveJobToDate(job, date);
    await updateJobDates(job, dates.startsAt, dates.endsAt);
    setDraggedJobId("");
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

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <button className="text-left" onClick={() => setWorkspace("schedule")}>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Capacity Scheduler</p>
            <h1 className="text-xl font-bold">Schedule, crews, equipment</h1>
          </button>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Workspace">
            <div className="flex rounded border border-line bg-panel p-1" data-testid="workspace-nav">
              {workspaces.map((item) => (
                <button
                  key={item.id}
                  className={`focus-ring rounded px-3 py-2 text-sm font-bold ${workspace === item.id ? "bg-white text-accent shadow-sm" : "text-slate-700"}`}
                  onClick={() => setWorkspace(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="sr-only" data-testid={ready ? "app-ready" : "app-loading"}>{ready ? "Ready" : "Loading"}</span>
            <button className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm font-bold text-accent disabled:opacity-50" disabled={!ready} onClick={() => openDrawer("docs")}>
              Docs
            </button>
            <button className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm font-bold text-accent disabled:opacity-50" disabled={!ready} onClick={() => openDrawer("resource")}>
              New Resource
            </button>
            <button className="focus-ring rounded bg-accent px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={!ready} onClick={() => openDrawer("job")}>
              New Job
            </button>
            <button className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm font-bold text-accent disabled:opacity-50" disabled={!ready} onClick={() => openDrawer("assign")}>
              Assign
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        {message && (
          <div className="rounded border border-line bg-white px-4 py-3 text-sm font-bold text-accent" role="status">
            {message}
          </div>
        )}

        {workspace === "schedule" && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]" data-testid="schedule-workspace">
            <div className="space-y-4">
              <ScheduleToolbar
                calendarMode={calendarMode}
                setCalendarMode={setCalendarMode}
                viewDate={viewDate}
                setViewDate={setViewDate}
                conflictCount={data.conflicts.length}
              />
              <CalendarBoard
                mode={calendarMode}
                viewDate={viewDate}
                jobs={data.jobs}
                assignmentsByJob={assignmentsByJob}
                conflictsByJob={conflictsByJob}
                conflicts={data.conflicts}
                onOpenJob={openJob}
                onDropJob={dropJobOnDay}
                onDragJob={setDraggedJobId}
                onShowMoreDay={(day) => {
                  setCalendarMode("week");
                  setViewDate(day);
                }}
              />
            </div>
            <PlannerPanel
              jobs={upcomingJobs}
              conflicts={data.conflicts}
              conflictsByJob={conflictsByJob}
              assignmentsByJob={assignmentsByJob}
              activeResources={activeResources}
              unassignedCount={unassignedCount}
              blockingCount={blockingConflicts.length}
              onOpenJob={openJob}
              onOpenIssue={showIssue}
            />
          </section>
        )}

        {workspace === "resources" && (
          <ResourceWorkspace
            resources={filteredResources}
            jobsByResource={jobsByResource}
            resourceFilter={resourceFilter}
            setResourceFilter={setResourceFilter}
            onOpenResource={openResource}
          />
        )}

        {workspace === "data" && (
          <DataWorkspace
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
                {drawerMode === "docs" && "Docs"}
              </h2>
              <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-bold" onClick={() => setDrawerMode(null)}>
                Close
              </button>
            </div>

            {(drawerMode === "resource" || drawerMode === "resource-detail") && (
              <ResourceForm form={resourceForm} setForm={setResourceForm} onSubmit={submitResource} onDelete={deleteSelectedResource} isEdit={drawerMode === "resource-detail"} />
            )}

            {(drawerMode === "job" || drawerMode === "job-detail") && (
              <div className="space-y-5">
                <JobForm form={jobForm} setForm={setJobForm} onSubmit={submitJob} onDelete={deleteSelectedJob} isEdit={drawerMode === "job-detail"} />
                {drawerMode === "job-detail" && selectedJob && (
                  <JobConflictPanel conflicts={selectedJobConflicts} onResolve={resolveConflict} />
                )}
                {drawerMode === "job-detail" && selectedJob && (
                  <AssignedResources
                    assignments={selectedJobResources}
                    onRemove={deleteAssignment}
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
                resources={assignmentResources}
                allResources={data.resources}
                form={assignmentForm}
                setForm={setAssignmentForm}
                onSubmit={submitAssignment}
              />
            )}

            {drawerMode === "docs" && <DocsPanel />}
          </aside>
        </div>
      )}
    </main>
  );
}

function ScheduleToolbar({
  calendarMode,
  setCalendarMode,
  viewDate,
  setViewDate,
  conflictCount
}: {
  calendarMode: CalendarMode;
  setCalendarMode: (mode: CalendarMode) => void;
  viewDate: Date;
  setViewDate: (date: Date) => void;
  conflictCount: number;
}) {
  const jump = calendarMode === "month" ? 30 : 7;
  return (
    <section className="rounded border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{displayMonth(viewDate)}</h2>
          <p className="text-sm text-slate-600">{conflictCount ? `${conflictCount} schedule issues` : "Schedule is clear"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-line bg-panel p-1">
            {(["month", "week"] as CalendarMode[]).map((mode) => (
              <button
                key={mode}
                className={`focus-ring rounded px-3 py-2 text-sm font-bold capitalize ${calendarMode === mode ? "bg-white text-accent shadow-sm" : "text-slate-700"}`}
                onClick={() => setCalendarMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-bold" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() - jump))}>
            Previous
          </button>
          <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-bold" onClick={() => setViewDate(new Date())}>
            Today
          </button>
          <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-bold" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + jump))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function CalendarBoard({
  mode,
  viewDate,
  jobs,
  assignmentsByJob,
  conflictsByJob,
  conflicts,
  onOpenJob,
  onDropJob,
  onDragJob,
  onShowMoreDay
}: {
  mode: CalendarMode;
  viewDate: Date;
  jobs: Job[];
  assignmentsByJob: Map<string, Assignment[]>;
  conflictsByJob: Map<string, ScheduleConflict[]>;
  conflicts: ScheduleConflict[];
  onOpenJob: (job: Job) => void;
  onDropJob: (event: React.DragEvent, date: Date) => void;
  onDragJob: (jobId: string) => void;
  onShowMoreDay: (date: Date) => void;
}) {
  const days = mode === "month" ? monthDays(viewDate) : weekDays(viewDate);
  const visibleJobIds = new Set(jobs.filter((job) => days.some((day) => sameDay(new Date(job.startsAt), day))).map((job) => job.id));
  const visibleConflicts = conflicts.filter((conflict) => {
    if (conflict.jobId && visibleJobIds.has(conflict.jobId)) return true;
    return conflict.relatedJobIds?.some((jobId) => visibleJobIds.has(jobId));
  });

  return (
    <section className="rounded border border-line bg-white p-3" data-testid={mode === "month" ? "month-view" : "week-view"}>
      {visibleConflicts.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 rounded border border-line bg-panel p-3 text-sm" data-testid={`${mode}-conflict-summary`}>
          <span className="font-bold text-rose">{visibleConflicts.filter((conflict) => conflict.severity === "error").length} blocking</span>
          <span className="text-slate-500">/</span>
          <span className="font-bold text-amber">{visibleConflicts.filter((conflict) => conflict.severity === "warning").length} warnings</span>
          <span className="text-slate-600">Click a marked job to review it.</span>
        </div>
      )}
      <div className={`grid gap-2 ${mode === "month" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-1 lg:grid-cols-7"}`}>
        {days.map((day) => {
          const dayJobs = jobs
            .filter((job) => sameDay(new Date(job.startsAt), day))
            .sort((a, b) => {
              const aConflicts = conflictsByJob.get(a.id)?.length ?? 0;
              const bConflicts = conflictsByJob.get(b.id)?.length ?? 0;
              return bConflicts - aConflicts || a.startsAt.localeCompare(b.startsAt) || b.title.localeCompare(a.title);
            });
          const visibleJobs = mode === "month" ? dayJobs.slice(0, 4) : dayJobs.slice(0, 10);
          const hiddenJobs = dayJobs.length - visibleJobs.length;
          const dayConflicts = uniqueConflicts(dayJobs.flatMap((job) => conflictsByJob.get(job.id) ?? []));
          const outsideMonth = mode === "month" && day.getMonth() !== viewDate.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={`min-h-40 rounded border p-2 ${dayConflicts.length > 0 ? "border-rose/60 bg-rose/5" : outsideMonth ? "border-slate-200 bg-slate-50" : "border-line bg-panel"}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDropJob(event, day)}
              data-testid={`calendar-day-${day.toISOString().slice(0, 10)}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-600">{displayDay(day)}</p>
                {dayConflicts.length > 0 && <span className="rounded bg-rose px-2 py-0.5 text-xs font-bold text-white">{dayConflicts.length}</span>}
              </div>
              <div className="space-y-2">
                {visibleJobs.map((job) => (
                  <JobCard key={job.id} job={job} assignments={assignmentsByJob.get(job.id) ?? []} conflicts={conflictsByJob.get(job.id) ?? []} onOpen={() => onOpenJob(job)} onDragJob={onDragJob} compact={mode === "month"} draggable />
                ))}
                {hiddenJobs > 0 && (
                  <button className="focus-ring w-full rounded border border-line bg-white px-2 py-2 text-xs font-bold text-accent" onClick={() => onShowMoreDay(day)}>
                    {hiddenJobs} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlannerPanel({
  jobs,
  conflicts,
  conflictsByJob,
  assignmentsByJob,
  activeResources,
  unassignedCount,
  blockingCount,
  onOpenJob,
  onOpenIssue
}: {
  jobs: Job[];
  conflicts: ScheduleConflict[];
  conflictsByJob: Map<string, ScheduleConflict[]>;
  assignmentsByJob: Map<string, Assignment[]>;
  activeResources: number;
  unassignedCount: number;
  blockingCount: number;
  onOpenJob: (job: Job) => void;
  onOpenIssue: (conflict: ScheduleConflict) => void;
}) {
  return (
    <aside className="space-y-4">
      <section className="rounded border border-line bg-white p-4">
        <h2 className="text-lg font-bold">Planner</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Blocking" value={blockingCount} tone={blockingCount ? "bad" : "good"} />
          <Stat label="Unassigned" value={unassignedCount} />
          <Stat label="Resources" value={activeResources} />
        </div>
      </section>

      <section className="rounded border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold">Needs attention</h3>
          <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{conflicts.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {conflicts.length === 0 && <p className="rounded border border-line p-3 text-sm text-mint">No open issues.</p>}
          {conflicts.slice(0, 5).map((conflict, index) => (
            <button key={`${conflict.type}-${index}`} className="focus-ring w-full rounded border border-line p-3 text-left text-sm hover:border-accent" onClick={() => onOpenIssue(conflict)}>
              <p className={`font-bold ${conflict.severity === "error" ? "text-rose" : "text-amber"}`}>{formatConflictType(conflict.type)}</p>
              <p className="mt-1 text-slate-700">{conflict.message}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded border border-line bg-white p-4">
        <h3 className="font-bold">Upcoming</h3>
        <div className="mt-3 space-y-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} assignments={assignmentsByJob.get(job.id) ?? []} conflicts={conflictsByJob.get(job.id) ?? []} onOpen={() => onOpenJob(job)} />
          ))}
        </div>
      </section>
    </aside>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <div className="rounded border border-line bg-panel p-3">
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "bad" ? "text-rose" : tone === "good" ? "text-mint" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function JobCard({ job, assignments, conflicts, onOpen, onDragJob, draggable = false, compact = false }: { job: Job; assignments: Assignment[]; conflicts: ScheduleConflict[]; onOpen: () => void; onDragJob?: (jobId: string) => void; draggable?: boolean; compact?: boolean }) {
  return (
    <button
      className={`focus-ring w-full rounded border text-left transition hover:border-accent ${compact ? "p-2" : "p-3"} ${conflictClasses(conflicts)}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", job.id);
        onDragJob?.(job.id);
      }}
      onClick={onOpen}
      data-testid={`job-card-${job.title}`}
    >
      <div className={`flex items-start justify-between ${compact ? "gap-2" : "gap-3"}`}>
        <div className="min-w-0">
          <h3 className={`truncate font-bold ${compact ? "text-xs" : ""}`}>{job.title}</h3>
          <p className={`${compact ? "text-xs" : "text-sm"} text-slate-600`}>
            {compact ? `${displayTime(job.startsAt)} - ${displayTime(job.endsAt)}` : `${displayDate(job.startsAt)} - ${displayDate(job.endsAt)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!compact && <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{job.status}</span>}
          {conflicts.length > 0 && (
            <span className={`rounded px-2 py-1 text-xs font-bold ${conflictBadgeClasses(conflicts)}`} title={conflictLabel(conflicts)} data-testid={`job-conflict-${job.title}`}>
              {compact ? "!" : conflictLabel(conflicts)}
            </span>
          )}
        </div>
      </div>
      {!compact && (
        <p className="mt-2 line-clamp-2 text-sm text-slate-700">
          {assignments.map((assignment) => `${assignment.resource?.name ?? assignment.resourceId}${assignment.resource?.type ? ` (${resourceLabels[assignment.resource.type]})` : ""}`).join(", ") || "No resources assigned"}
        </p>
      )}
    </button>
  );
}

function ResourceWorkspace({
  resources,
  jobsByResource,
  resourceFilter,
  setResourceFilter,
  onOpenResource
}: {
  resources: Resource[];
  jobsByResource: Map<string, Job[]>;
  resourceFilter: ResourceType | "ALL";
  setResourceFilter: (value: ResourceType | "ALL") => void;
  onOpenResource: (resource: Resource) => void;
}) {
  return (
    <section className="space-y-4" data-testid="resource-view">
      <div className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Resources</h2>
            <p className="text-sm text-slate-600">{resources.length} shown</p>
          </div>
          <select className="focus-ring rounded border border-line bg-white px-3 py-2 text-sm font-bold" value={resourceFilter} onChange={(event) => setResourceFilter(event.target.value as ResourceType | "ALL")}>
            <option value="ALL">All types</option>
            {resourceTypes.map((type) => <option key={type} value={type}>{resourceLabels[type]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => {
          const jobs = jobsByResource.get(resource.id) ?? [];
          return (
            <button key={resource.id} className="focus-ring rounded border border-line bg-white p-4 text-left transition hover:border-accent" onClick={() => onOpenResource(resource)}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{resource.name}</h3>
                <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{resourceLabels[resource.type]}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{resource.active ? "Active" : "Inactive"} {resource.tags ? `- ${resource.tags}` : ""}</p>
              <p className="mt-3 text-sm">{jobs.map((job) => job.title).join(", ") || "No assignments"}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DataWorkspace({
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
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" data-testid="data-workspace">
      <div className="rounded border border-line bg-white p-4">
        <h2 className="text-lg font-bold">CSV import</h2>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <label className="block text-sm font-bold">
            Import type
            <select className="mt-1 w-full rounded border border-line p-2" value={csvEntity} onChange={(event) => setCsvEntity(event.target.value)}>
              <option value="resources">Resources</option>
              <option value="jobs">Jobs</option>
              <option value="assignments">Assignments</option>
            </select>
          </label>
          <label className="block text-sm font-bold">
            CSV
            <textarea className="mt-1 min-h-56 w-full rounded border border-line p-2 font-mono text-sm" value={csvImport} onChange={(event) => setCsvImport(event.target.value)} data-testid="csv-input" />
          </label>
          <button className="focus-ring rounded bg-accent px-4 py-2 font-bold text-white" type="submit">
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
      </div>

      <aside className="space-y-4">
        <section className="rounded border border-line bg-white p-4" data-testid="import-export-view">
          <h3 className="font-bold">Export</h3>
          <div className="mt-3 grid gap-2">
            {["resources", "jobs", "assignments"].map((entity) => (
              <a key={entity} className="focus-ring rounded border border-line px-3 py-2 text-sm font-bold text-accent" href={`/api/csv/export?entity=${entity}`} data-testid={`export-${entity}`}>
                Export {entity}
              </a>
            ))}
          </div>
        </section>
        <DocsPanel compact />
      </aside>
    </section>
  );
}

function DocsPanel({ compact = false }: { compact?: boolean }) {
  const endpoints = [
    ["GET", "/api/bootstrap", "Full schedule snapshot with conflicts"],
    ["GET/POST", "/api/resources", "List or create resources"],
    ["PATCH/DELETE", "/api/resources/:id", "Edit or delete one resource"],
    ["GET/POST", "/api/jobs", "List or create jobs"],
    ["PATCH/DELETE", "/api/jobs/:id", "Edit, reschedule, or delete one job"],
    ["GET/POST", "/api/assignments", "List or create assignments"],
    ["DELETE", "/api/assignments/:id", "Remove one assignment"],
    ["GET", "/api/csv/export?entity=resources", "Export resources, jobs, or assignments"],
    ["POST", "/api/csv/import", "Import resources, jobs, or assignments"]
  ];

  return (
    <section className="rounded border border-line bg-white p-4" data-testid="docs-view">
      <h3 className="font-bold">Docs</h3>
      <p className="mt-2 text-sm text-slate-700">
        The app keeps live scheduling data in one database and uses CSV for export, backup, and spreadsheet handoff. CSV is intentionally not the live database because assignments, deletes, and conflicts need reliable links.
      </p>
      {!compact && (
        <div className="mt-4 grid gap-3 text-sm">
          {["Resources: people, crews, equipment, subcontractors", "Jobs: scheduled work with dates, status, and equipment need", "Assignments: the link between jobs and resources", "Conflicts: calculated from the current schedule"].map((item) => (
            <p key={item} className="rounded bg-panel px-3 py-2">{item}</p>
          ))}
        </div>
      )}
      <details className="mt-4" open={!compact}>
        <summary className="cursor-pointer text-sm font-bold text-accent">API reference</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Method</th>
                <th className="py-2 pr-3">Path</th>
                <th className="py-2">Use</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(([method, path, use]) => (
                <tr key={`${method}-${path}`} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-3 font-bold text-accent">{method}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{path}</td>
                  <td className="py-2">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function Field({ label, value, onChange, testId, type = "text" }: { label: string; value: string; onChange: (value: string) => void; testId?: string; type?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input className="mt-1 w-full rounded border border-line p-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} />
    </label>
  );
}

function ResourceForm({ form, setForm, onSubmit, onDelete, isEdit }: { form: { name: string; type: ResourceType; active: boolean; tags: string; notes: string }; setForm: (value: { name: string; type: ResourceType; active: boolean; tags: string; notes: string }) => void; onSubmit: (event: React.FormEvent) => void; onDelete: () => void; isEdit: boolean }) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} testId="resource-name" />
      <label className="block text-sm font-bold">
        Type
        <select className="mt-1 w-full rounded border border-line p-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ResourceType })} data-testid="resource-type">
          {resourceTypes.map((type) => <option key={type} value={type}>{resourceLabels[type]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
        Active
      </label>
      <Field label="Tags / skills" value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
      <label className="block text-sm font-bold">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded border border-line p-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="focus-ring flex-1 rounded bg-accent px-4 py-2 font-bold text-white" type="submit">
          {isEdit ? "Save resource" : "Add resource"}
        </button>
        {isEdit && (
          <button className="focus-ring rounded border border-rose px-4 py-2 font-bold text-rose" type="button" onClick={onDelete} data-testid="delete-resource">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function JobForm({ form, setForm, onSubmit, onDelete, isEdit }: { form: { title: string; projectRef: string; startsAt: string; endsAt: string; status: JobStatus; workType: string; requiresEquipment: boolean; notes: string }; setForm: (value: { title: string; projectRef: string; startsAt: string; endsAt: string; status: JobStatus; workType: string; requiresEquipment: boolean; notes: string }) => void; onSubmit: (event: React.FormEvent) => void; onDelete: () => void; isEdit: boolean }) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Field label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} testId="job-title" />
      <Field label="Project ref" value={form.projectRef} onChange={(projectRef) => setForm({ ...form, projectRef })} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Start" type="datetime-local" value={form.startsAt} onChange={(startsAt) => setForm({ ...form, startsAt })} testId="job-start" />
        <Field label="End" type="datetime-local" value={form.endsAt} onChange={(endsAt) => setForm({ ...form, endsAt })} testId="job-end" />
      </div>
      <label className="block text-sm font-bold">
        Status
        <select className="mt-1 w-full rounded border border-line p-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as JobStatus })}>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <Field label="Work type" value={form.workType} onChange={(workType) => setForm({ ...form, workType })} />
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={form.requiresEquipment} onChange={(event) => setForm({ ...form, requiresEquipment: event.target.checked })} />
        Requires equipment
      </label>
      <label className="block text-sm font-bold">
        Notes
        <textarea className="mt-1 min-h-24 w-full rounded border border-line p-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="focus-ring flex-1 rounded bg-accent px-4 py-2 font-bold text-white" type="submit">
          {isEdit ? "Save job" : "Add job"}
        </button>
        {isEdit && (
          <button className="focus-ring rounded border border-rose px-4 py-2 font-bold text-rose" type="button" onClick={onDelete} data-testid="delete-job">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

function AssignForm({ jobs, resources, allResources, form, setForm, onSubmit }: { jobs: Job[]; resources: Resource[]; allResources: Resource[]; form: { jobId: string; resourceType: ResourceType | "ALL"; resourceIds: string[]; role: string }; setForm: (value: { jobId: string; resourceType: ResourceType | "ALL"; resourceIds: string[]; role: string }) => void; onSubmit: (event: React.FormEvent) => void }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-sm font-bold">
        Job
        <select className="mt-1 w-full rounded border border-line p-2" value={form.jobId} onChange={(event) => setForm({ ...form, jobId: event.target.value })} data-testid="assign-job">
          <option value="">Choose a job</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
      </label>
      <label className="block text-sm font-bold">
        Resource type
        <select className="mt-1 w-full rounded border border-line p-2" value={form.resourceType} onChange={(event) => setForm({ ...form, resourceType: event.target.value as ResourceType | "ALL", resourceIds: [] })} data-testid="assign-resource-type">
          <option value="ALL">All types</option>
          {resourceTypes.map((type) => <option key={type} value={type}>{resourceLabels[type]}</option>)}
        </select>
      </label>
      <div className="rounded border border-line p-3">
        <p className="mb-2 text-sm font-bold">Resources</p>
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
              <span className="font-bold">{resource.name}</span>
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
      <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-bold text-white" type="submit">
        Assign selected resources
      </button>
    </form>
  );
}

function JobConflictPanel({ conflicts, onResolve }: { conflicts: ScheduleConflict[]; onResolve: (conflict: ScheduleConflict) => void }) {
  return (
    <section className="rounded border border-line p-3" data-testid="job-conflict-panel">
      <h3 className="font-bold">Schedule check</h3>
      {conflicts.length === 0 && <p className="mt-2 text-sm text-mint">No conflicts on this job.</p>}
      <div className="mt-3 space-y-2">
        {uniqueConflicts(conflicts).map((conflict, index) => (
          <div key={`${conflict.type}-${index}`} className={`rounded border px-3 py-2 text-sm ${conflict.severity === "error" ? "border-rose bg-rose/5" : "border-amber bg-amber/5"}`}>
            <p className={`font-bold ${conflict.severity === "error" ? "text-rose" : "text-amber"}`}>{formatConflictType(conflict.type)}</p>
            <p className="mt-1">{conflict.message}</p>
            {conflict.type === "DOUBLE_BOOKED_RESOURCE" && (
              <button className="focus-ring mt-2 rounded border border-line bg-white px-3 py-2 font-bold text-accent" type="button" onClick={() => onResolve(conflict)}>
                Move later job after earlier job
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AssignedResources({ assignments, onRemove, openAssign }: { assignments: Assignment[]; onRemove: (assignmentId: string) => void; openAssign: () => void }) {
  return (
    <section className="rounded border border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">Assigned resources</h3>
        <button className="focus-ring rounded border border-line px-3 py-2 text-sm font-bold text-accent" onClick={openAssign}>
          Add resources
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {assignments.length === 0 && <p className="text-sm text-slate-600">No resources assigned.</p>}
        {assignments.map((assignment) => (
          <div key={assignment.id} className="flex items-center justify-between gap-3 rounded bg-panel px-3 py-2 text-sm">
            <p>
              <span className="font-bold">{assignment.resource?.name ?? assignment.resourceId}</span>
              {assignment.resource?.type && <span className="text-slate-600"> ({resourceLabels[assignment.resource.type]})</span>}
            </p>
            <button className="focus-ring rounded border border-line bg-white px-2 py-1 text-xs font-bold text-accent" type="button" onClick={() => onRemove(assignment.id)} data-testid={`remove-assignment-${assignment.id}`}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
