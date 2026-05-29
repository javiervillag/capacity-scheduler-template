import { NextResponse } from "next/server";
import { createDemoAssignment, demoSnapshot, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(demoSnapshot().assignments);
  return NextResponse.json(
    await prisma.assignment.findMany({
      include: { job: true, resource: true },
      orderBy: { createdAt: "asc" }
    })
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.jobId || !body.resourceId) {
    return NextResponse.json({ error: "Job and resource are required." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json(
      createDemoAssignment({
        jobId: String(body.jobId),
        resourceId: String(body.resourceId),
        role: body.role ? String(body.role) : ""
      }),
      { status: 201 }
    );
  }

  const assignment = await prisma.assignment.create({
    data: {
      jobId: String(body.jobId),
      resourceId: String(body.resourceId),
      role: body.role ? String(body.role) : ""
    },
    include: { job: true, resource: true }
  });

  return NextResponse.json(assignment, { status: 201 });
}
