import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { createDemoJob, demoSnapshot, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(demoSnapshot().jobs);
  return NextResponse.json(await prisma.job.findMany({ orderBy: [{ startsAt: "asc" }, { title: "asc" }] }));
}

export async function POST(request: Request) {
  const body = await request.json();
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);

  if (!body.title || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Title, start, and end are required." }, { status: 400 });
  }

  if (body.status && !Object.values(JobStatus).includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json(
      createDemoJob({
        title: String(body.title),
        projectRef: body.projectRef ? String(body.projectRef) : "",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status: body.status ?? JobStatus.SCHEDULED,
        workType: body.workType ? String(body.workType) : "",
        notes: body.notes ? String(body.notes) : "",
        requiresEquipment: Boolean(body.requiresEquipment)
      }),
      { status: 201 }
    );
  }

  const job = await prisma.job.create({
    data: {
      title: String(body.title),
      projectRef: body.projectRef ? String(body.projectRef) : "",
      startsAt,
      endsAt,
      status: body.status ?? JobStatus.SCHEDULED,
      workType: body.workType ? String(body.workType) : "",
      notes: body.notes ? String(body.notes) : "",
      requiresEquipment: Boolean(body.requiresEquipment)
    }
  });

  return NextResponse.json(job, { status: 201 });
}
