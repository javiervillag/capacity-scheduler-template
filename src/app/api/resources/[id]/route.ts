import { NextRequest, NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { deleteDemoResource, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const { id } = await params;

  if (body.type && !Object.values(ResourceType).includes(body.type)) {
    return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
  }

  if (isDemoMode()) {
    const { demoStore } = await import("@/lib/demo/store");
    const store = demoStore();
    const index = store.resources.findIndex((resource) => resource.id === id);
    if (index === -1) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    store.resources[index] = {
      ...store.resources[index],
      name: body.name !== undefined ? String(body.name) : store.resources[index].name,
      type: body.type ?? store.resources[index].type,
      active: body.active !== undefined ? Boolean(body.active) : store.resources[index].active,
      tags: body.tags !== undefined ? String(body.tags) : store.resources[index].tags,
      notes: body.notes !== undefined ? String(body.notes) : store.resources[index].notes,
      updatedAt: new Date().toISOString()
    };
    return NextResponse.json(store.resources[index]);
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.type !== undefined) data.type = body.type;
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.tags !== undefined) data.tags = String(body.tags);
  if (body.notes !== undefined) data.notes = String(body.notes);

  return NextResponse.json(await prisma.resource.update({ where: { id }, data }));
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isDemoMode()) {
    deleteDemoResource(id);
    return NextResponse.json({ ok: true });
  }

  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
