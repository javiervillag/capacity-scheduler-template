import { NextRequest, NextResponse } from "next/server";
import { deleteDemoAssignment, isDemoMode } from "@/lib/demo/store";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<unknown> }) {
  const { id } = await params as { id: string };

  if (isDemoMode()) {
    deleteDemoAssignment(id);
    return NextResponse.json({ ok: true });
  }

  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
