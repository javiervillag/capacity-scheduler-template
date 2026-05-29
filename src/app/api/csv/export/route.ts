import { NextResponse } from "next/server";
import { demoSnapshot, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";
import { toCsv } from "@/lib/csv/csv";

export async function GET(request: Request) {
  const entity = new URL(request.url).searchParams.get("entity") ?? "resources";
  const demo = isDemoMode() ? demoSnapshot() : null;
  let csv = "";

  if (entity === "jobs") {
    const rows = demo?.jobs ?? (await prisma.job.findMany({ orderBy: { startsAt: "asc" } }));
    csv = toCsv(
      rows.map((job) => ({
        id: job.id,
        title: job.title,
        projectRef: job.projectRef,
        startsAt: typeof job.startsAt === "string" ? job.startsAt : job.startsAt.toISOString(),
        endsAt: typeof job.endsAt === "string" ? job.endsAt : job.endsAt.toISOString(),
        status: job.status,
        workType: job.workType,
        requiresEquipment: job.requiresEquipment,
        notes: job.notes
      }))
    );
  } else if (entity === "assignments") {
    const rows = demo?.assignments ?? (await prisma.assignment.findMany({ include: { job: true, resource: true } }));
    csv = toCsv(
      rows.map((assignment) => ({
        id: assignment.id,
        jobId: assignment.jobId,
        jobTitle: assignment.job?.title ?? "",
        resourceId: assignment.resourceId,
        resourceName: assignment.resource?.name ?? "",
        role: assignment.role
      }))
    );
  } else {
    const rows = demo?.resources ?? (await prisma.resource.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }));
    csv = toCsv(
      rows.map((resource) => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        active: resource.active,
        tags: resource.tags,
        notes: resource.notes
      }))
    );
  }

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${entity}.csv"`
    }
  });
}
