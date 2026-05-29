import { NextRequest, NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { deleteDemoJob, isDemoMode, updateDemoJob } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const { id } = await params;
  const data: Record<string, unknown> = {};
  const demoData: Record<string, unknown> = {};

  if (body.startsAt) {
    data.startsAt = new Date(body.startsAt);
    demoData.startsAt = new Date(body.startsAt).toISOString();
  }
  if (body.endsAt) {
    data.endsAt = new Date(body.endsAt);
    demoData.endsAt = new Date(body.endsAt).toISOString();
  }
  if (body.status) {
    if (!Object.values(JobStatus).includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
    demoData.status = body.status;
  }
  if (body.title !== undefined) data.title = demoData.title = String(body.title);
  if (body.projectRef !== undefined) data.projectRef = demoData.projectRef = String(body.projectRef);
  if (body.workType !== undefined) data.workType = demoData.workType = String(body.workType);
  if (body.notes !== undefined) data.notes = demoData.notes = String(body.notes);
  if (body.requiresEquipment !== undefined) data.requiresEquipment = demoData.requiresEquipment = Boolean(body.requiresEquipment);

  if (isDemoMode()) {
    return NextResponse.json(updateDemoJob(id, demoData));
  }

  return NextResponse.json(await prisma.job.update({ where: { id }, data }));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isDemoMode()) {
    deleteDemoJob(id);
    return NextResponse.json({ ok: true });
  }

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
