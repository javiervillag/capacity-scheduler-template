"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScheduleConflict } from "@/lib/scheduling/types";

type Resource = {
  id: string;
  name: string;
  type: "PERSON" | "CREW" | "EQUIPMENT" | "SUBCONTRACTOR";
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
  status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
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
const tabs = ["Dashboard", "Month", "Week", "Resources", "Conflicts", "Import/Export"] as const;
const statuses = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"] as const;

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function jobDurationHours(job: Job) {
  return Math.max(1, (new Date(job.endsAt).getTime() - new Date(job.startsAt).getTime()) / 3_600_000);
}

export default function Home() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Dashboard");
  const [message, setMessage] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [resourceForm, setResourceForm] = useState({ name: "", type: "PERSON", tags: "", notes: "" });
  const [jobForm, setJobForm] = useState({
    title: "",
    projectRef: "",
    startsAt: localInputValue(new Date(Date.now() + 3_600_000)),
    endsAt: localInputValue(new Date(Date.now() + 7_200_000)),
    status: "SCHEDULED",
    workType: "",
    requiresEquipment: false,
    notes: ""
  });
  const [assignmentForm, setAssignmentForm] = useState({ jobId: "", resourceId: "", role: "" });
  const [csvImport, setCsvImport] = useState("name,type\nExample Tech,PERSON\nExample Bad Row,NOPE");
  const [csvEntity, setCsvEntity] = useState("resources");

  async function refresh() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    setData(await response.json());
  }

  useEffect(() => {
    refresh();
  }, []);

  const assignmentsByJob = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    data.assignments.forEach((assignment) => {
      map.set(assignment.jobId, [...(map.get(assignment.jobId) ?? []), assignment]);
    });
    return map;
  }, [data.assignments]);

  const weekJobs = data.jobs.filter((job) => {
    const startsAt = new Date(job.startsAt);
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 3_600_000);
    return startsAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && startsAt <= weekEnd;
  });

  async function submitResource(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(resourceForm)
    });
    setMessage(response.ok ? "Resource created." : "Resource could not be created.");
    if (response.ok) {
      setResourceForm({ name: "", type: "PERSON", tags: "", notes: "" });
      await refresh();
    }
  }

  async function submitJob(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...jobForm,
        startsAt: new Date(jobForm.startsAt).toISOString(),
        endsAt: new Date(jobForm.endsAt).toISOString()
      })
    });
    setMessage(response.ok ? "Job created." : "Job could not be created.");
    if (response.ok) await refresh();
  }

  async function submitAssignment(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(assignmentForm)
    });
    setMessage(response.ok ? "Assignment created." : "Assignment could not be created.");
    if (response.ok) await refresh();
  }

  async function resolveConflict(conflict: ScheduleConflict) {
    if (!conflict.relatedJobIds || conflict.relatedJobIds.length < 2) return;
    const first = data.jobs.find((job) => job.id === conflict.relatedJobIds?.[0]);
    const second = data.jobs.find((job) => job.id === conflict.relatedJobIds?.[1]);
    if (!first || !second) return;

    const duration = jobDurationHours(second);
    const startsAt = new Date(first.endsAt);
    const endsAt = new Date(startsAt.getTime() + duration * 3_600_000);
    await fetch(`/api/jobs/${second.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
    });
    setMessage("Schedule adjusted.");
    await refresh();
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
    <main className="min-h-screen bg-panel">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">Capacity Scheduler</p>
            <h1 className="text-2xl font-bold text-ink">Internal scheduling and capacity planning</h1>
          </div>
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
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          {message && (
            <div className="rounded border border-line bg-white px-4 py-3 text-sm font-semibold text-accent" role="status">
              {message}
            </div>
          )}

          {activeTab === "Dashboard" && (
            <div className="space-y-5" data-testid="dashboard-view">
              <div className="grid gap-3 md:grid-cols-5">
                <Metric label="Jobs this week" value={weekJobs.length} />
                <Metric label="Open conflicts" value={data.conflicts.length} tone={data.conflicts.length ? "bad" : "good"} />
                <Metric label="Unassigned jobs" value={data.conflicts.filter((conflict) => conflict.type === "NO_ASSIGNMENTS").length} />
                <Metric label="Active resources" value={data.resources.filter((resource) => resource.active).length} />
                <Metric label="Equipment booked" value={bookedEquipment(data)} />
              </div>
              <JobList title="Upcoming schedule" jobs={data.jobs.slice(0, 8)} assignmentsByJob={assignmentsByJob} />
            </div>
          )}

          {activeTab === "Month" && (
            <CalendarGrid title="Month view" jobs={data.jobs} assignmentsByJob={assignmentsByJob} testId="month-view" />
          )}

          {activeTab === "Week" && (
            <CalendarGrid title="Week view" jobs={data.jobs.slice(0, 12)} assignmentsByJob={assignmentsByJob} testId="week-view" />
          )}

          {activeTab === "Resources" && (
            <ResourceView resources={data.resources} assignments={data.assignments} jobs={data.jobs} />
          )}

          {activeTab === "Conflicts" && (
            <ConflictView conflicts={data.conflicts} onResolve={resolveConflict} />
          )}

          {activeTab === "Import/Export" && (
            <section className="rounded border border-line bg-white p-4" data-testid="import-export-view">
              <h2 className="text-lg font-bold">Import and export</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {["resources", "jobs", "assignments"].map((entity) => (
                  <a
                    key={entity}
                    className="focus-ring rounded border border-line px-3 py-2 text-sm font-semibold text-accent"
                    href={`/api/csv/export?entity=${entity}`}
                    data-testid={`export-${entity}`}
                  >
                    Export {entity}
                  </a>
                ))}
              </div>
              <form className="mt-5 space-y-3" onSubmit={submitImport}>
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
                  <textarea
                    className="mt-1 min-h-36 w-full rounded border border-line p-2 font-mono text-sm"
                    value={csvImport}
                    onChange={(event) => setCsvImport(event.target.value)}
                    data-testid="csv-input"
                  />
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
          )}
        </section>

        <aside className="space-y-4">
          <Panel title="Create resource">
            <form className="space-y-3" onSubmit={submitResource}>
              <Field label="Name" value={resourceForm.name} onChange={(name) => setResourceForm({ ...resourceForm, name })} testId="resource-name" />
              <label className="block text-sm font-semibold">
                Type
                <select
                  className="mt-1 w-full rounded border border-line p-2"
                  value={resourceForm.type}
                  onChange={(event) => setResourceForm({ ...resourceForm, type: event.target.value })}
                  data-testid="resource-type"
                >
                  <option value="PERSON">Person</option>
                  <option value="CREW">Crew</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="SUBCONTRACTOR">Subcontractor</option>
                </select>
              </label>
              <Field label="Tags" value={resourceForm.tags} onChange={(tags) => setResourceForm({ ...resourceForm, tags })} />
              <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
                Add resource
              </button>
            </form>
          </Panel>

          <Panel title="Create job">
            <form className="space-y-3" onSubmit={submitJob}>
              <Field label="Title" value={jobForm.title} onChange={(title) => setJobForm({ ...jobForm, title })} testId="job-title" />
              <Field label="Project ref" value={jobForm.projectRef} onChange={(projectRef) => setJobForm({ ...jobForm, projectRef })} />
              <label className="block text-sm font-semibold">
                Start
                <input className="mt-1 w-full rounded border border-line p-2" type="datetime-local" value={jobForm.startsAt} onChange={(event) => setJobForm({ ...jobForm, startsAt: event.target.value })} data-testid="job-start" />
              </label>
              <label className="block text-sm font-semibold">
                End
                <input className="mt-1 w-full rounded border border-line p-2" type="datetime-local" value={jobForm.endsAt} onChange={(event) => setJobForm({ ...jobForm, endsAt: event.target.value })} data-testid="job-end" />
              </label>
              <label className="block text-sm font-semibold">
                Status
                <select className="mt-1 w-full rounded border border-line p-2" value={jobForm.status} onChange={(event) => setJobForm({ ...jobForm, status: event.target.value })}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <Field label="Work type" value={jobForm.workType} onChange={(workType) => setJobForm({ ...jobForm, workType })} />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={jobForm.requiresEquipment} onChange={(event) => setJobForm({ ...jobForm, requiresEquipment: event.target.checked })} />
                Requires equipment
              </label>
              <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
                Add job
              </button>
            </form>
          </Panel>

          <Panel title="Assign resource">
            <form className="space-y-3" onSubmit={submitAssignment}>
              <label className="block text-sm font-semibold">
                Job
                <select className="mt-1 w-full rounded border border-line p-2" value={assignmentForm.jobId} onChange={(event) => setAssignmentForm({ ...assignmentForm, jobId: event.target.value })} data-testid="assign-job">
                  <option value="">Choose a job</option>
                  {data.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Resource
                <select className="mt-1 w-full rounded border border-line p-2" value={assignmentForm.resourceId} onChange={(event) => setAssignmentForm({ ...assignmentForm, resourceId: event.target.value })} data-testid="assign-resource">
                  <option value="">Choose a resource</option>
                  {data.resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                </select>
              </label>
              <Field label="Role" value={assignmentForm.role} onChange={(role) => setAssignmentForm({ ...assignmentForm, role })} />
              <button className="focus-ring w-full rounded bg-accent px-4 py-2 font-semibold text-white" type="submit">
                Assign
              </button>
            </form>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone === "bad" ? "text-rose" : tone === "good" ? "text-mint" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-line bg-white p-4">
      <h2 className="mb-3 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, testId }: { label: string; value: string; onChange: (value: string) => void; testId?: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input className="mt-1 w-full rounded border border-line p-2" value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} />
    </label>
  );
}

function JobList({ title, jobs, assignmentsByJob }: { title: string; jobs: Job[]; assignmentsByJob: Map<string, Assignment[]> }) {
  return (
    <section className="rounded border border-line bg-white p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded border border-line p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{job.title}</h3>
                <p className="text-sm text-slate-600">{displayDate(job.startsAt)} - {displayDate(job.endsAt)}</p>
              </div>
              <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{job.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              {(assignmentsByJob.get(job.id) ?? []).map((assignment) => assignment.resource?.name).filter(Boolean).join(", ") || "No resources assigned"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CalendarGrid({ title, jobs, assignmentsByJob, testId }: { title: string; jobs: Job[]; assignmentsByJob: Map<string, Assignment[]>; testId: string }) {
  return (
    <section className="rounded border border-line bg-white p-4" data-testid={testId}>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {jobs.map((job) => (
          <div key={job.id} className="min-h-28 rounded border border-line p-3">
            <p className="text-sm font-semibold text-accent">{displayDate(job.startsAt)}</p>
            <h3 className="mt-1 font-bold">{job.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{job.workType || "General work"}</p>
            <p className="mt-2 text-xs text-slate-600">{(assignmentsByJob.get(job.id) ?? []).length} assigned</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResourceView({ resources, assignments, jobs }: { resources: Resource[]; assignments: Assignment[]; jobs: Job[] }) {
  return (
    <section className="rounded border border-line bg-white p-4" data-testid="resource-view">
      <h2 className="text-lg font-bold">Resource view</h2>
      <div className="mt-4 grid gap-3">
        {resources.slice(0, 24).map((resource) => {
          const resourceAssignments = assignments.filter((assignment) => assignment.resourceId === resource.id);
          return (
            <article key={resource.id} className="rounded border border-line p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-bold">{resource.name}</h3>
                <span className="rounded bg-panel px-2 py-1 text-xs font-bold">{resource.type}</span>
              </div>
              <p className="text-sm text-slate-600">{resource.active ? "Active" : "Inactive"} {resource.tags ? `- ${resource.tags}` : ""}</p>
              <p className="mt-2 text-sm">{resourceAssignments.map((assignment) => jobs.find((job) => job.id === assignment.jobId)?.title).filter(Boolean).join(", ") || "No assignments"}</p>
            </article>
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

function bookedEquipment(data: AppData) {
  const equipmentIds = new Set(data.resources.filter((resource) => resource.type === "EQUIPMENT").map((resource) => resource.id));
  return new Set(data.assignments.filter((assignment) => equipmentIds.has(assignment.resourceId)).map((assignment) => assignment.resourceId)).size;
}
