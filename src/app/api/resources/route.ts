import { NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { createDemoResource, demoSnapshot, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(demoSnapshot().resources);
  return NextResponse.json(await prisma.resource.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }));
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.name || !body.type || !Object.values(ResourceType).includes(body.type)) {
    return NextResponse.json({ error: "Name and valid resource type are required." }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json(
      createDemoResource({
        name: String(body.name),
        type: body.type,
        active: body.active ?? true,
        tags: body.tags ? String(body.tags) : "",
        notes: body.notes ? String(body.notes) : ""
      }),
      { status: 201 }
    );
  }

  const resource = await prisma.resource.create({
    data: {
      name: String(body.name),
      type: body.type,
      active: body.active ?? true,
      tags: body.tags ? String(body.tags) : "",
      notes: body.notes ? String(body.notes) : ""
    }
  });

  return NextResponse.json(resource, { status: 201 });
}
