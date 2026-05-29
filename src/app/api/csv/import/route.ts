import { NextResponse } from "next/server";
import { JobStatus, ResourceType } from "@prisma/client";
import { createDemoAssignment, createDemoJob, createDemoResource, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";
import { parseCsv, requireColumns } from "@/lib/csv/csv";

function booleanValue(value: string) {
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
}

export async function POST(request: Request) {
  const body = await request.json();
  const entity = String(body.entity ?? "resources");
  const parsed = parseCsv(String(body.csv ?? ""));
  const errors = [...parsed.errors];

  if (entity === "jobs") {
    errors.push(...requireColumns(parsed.rows, ["title", "startsAt", "endsAt"]).map((column) => `Missing column: ${column}`));
    parsed.rows.forEach((row, index) => {
      if (!row.title) errors.push(`Row ${index + 2}: title is required.`);
      if (Number.isNaN(new Date(row.startsAt).getTime())) errors.push(`Row ${index + 2}: startsAt is invalid.`);
      if (Number.isNaN(new Date(row.endsAt).getTime())) errors.push(`Row ${index + 2}: endsAt is invalid.`);
      if (row.status && !Object.values(JobStatus).includes(row.status as JobStatus)) errors.push(`Row ${index + 2}: status is invalid.`);
    });
    if (errors.length) return NextResponse.json({ imported: 0, errors }, { status: 400 });
    if (isDemoMode()) {
      parsed.rows.forEach((row) =>
        createDemoJob({
          title: row.title,
          projectRef: row.projectRef ?? "",
          startsAt: new Date(row.startsAt).toISOString(),
          endsAt: new Date(row.endsAt).toISOString(),
          status: (row.status as JobStatus) || JobStatus.SCHEDULED,
          workType: row.workType ?? "",
          notes: row.notes ?? "",
          requiresEquipment: booleanValue(row.requiresEquipment ?? "")
        })
      );
      return NextResponse.json({ imported: parsed.rows.length, errors: [] });
    }
    await prisma.job.createMany({
      data: parsed.rows.map((row) => ({
        title: row.title,
        projectRef: row.projectRef ?? "",
        startsAt: new Date(row.startsAt),
        endsAt: new Date(row.endsAt),
        status: (row.status as JobStatus) || JobStatus.SCHEDULED,
        workType: row.workType ?? "",
        notes: row.notes ?? "",
        requiresEquipment: booleanValue(row.requiresEquipment ?? "")
      }))
    });
  } else if (entity === "assignments") {
    errors.push(...requireColumns(parsed.rows, ["jobId", "resourceId"]).map((column) => `Missing column: ${column}`));
    if (errors.length) return NextResponse.json({ imported: 0, errors }, { status: 400 });
    if (isDemoMode()) {
      parsed.rows.forEach((row) =>
        createDemoAssignment({
          jobId: row.jobId,
          resourceId: row.resourceId,
          role: row.role ?? ""
        })
      );
      return NextResponse.json({ imported: parsed.rows.length, errors: [] });
    }
    await prisma.assignment.createMany({
      skipDuplicates: true,
      data: parsed.rows.map((row) => ({
        jobId: row.jobId,
        resourceId: row.resourceId,
        role: row.role ?? ""
      }))
    });
  } else {
    errors.push(...requireColumns(parsed.rows, ["name", "type"]).map((column) => `Missing column: ${column}`));
    const seen = new Set<string>();
    parsed.rows.forEach((row, index) => {
      if (!row.name) errors.push(`Row ${index + 2}: name is required.`);
      if (!Object.values(ResourceType).includes(row.type as ResourceType)) errors.push(`Row ${index + 2}: type is invalid.`);
      const key = `${row.name}:${row.type}`;
      if (seen.has(key)) errors.push(`Row ${index + 2}: duplicate resource name/type in CSV.`);
      seen.add(key);
    });
    if (errors.length) return NextResponse.json({ imported: 0, errors }, { status: 400 });
    if (isDemoMode()) {
      parsed.rows.forEach((row) =>
        createDemoResource({
          name: row.name,
          type: row.type as ResourceType,
          active: row.active ? booleanValue(row.active) : true,
          tags: row.tags ?? "",
          notes: row.notes ?? ""
        })
      );
      return NextResponse.json({ imported: parsed.rows.length, errors: [] });
    }
    await prisma.resource.createMany({
      skipDuplicates: true,
      data: parsed.rows.map((row) => ({
        name: row.name,
        type: row.type as ResourceType,
        active: row.active ? booleanValue(row.active) : true,
        tags: row.tags ?? "",
        notes: row.notes ?? ""
      }))
    });
  }

  return NextResponse.json({ imported: parsed.rows.length, errors: [] });
}
