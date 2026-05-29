import { prisma } from "@/lib/db/prisma";
import { demoSnapshot, isDemoMode } from "@/lib/demo/store";
import { detectScheduleConflicts } from "./conflicts";

export async function getScheduleSnapshot() {
  if (isDemoMode()) return demoSnapshot();

  const [resources, jobs, assignments] = await Promise.all([
    prisma.resource.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.job.findMany({ orderBy: [{ startsAt: "asc" }, { title: "asc" }] }),
    prisma.assignment.findMany({
      orderBy: { createdAt: "asc" },
      include: { job: true, resource: true }
    })
  ]);

  const conflicts = detectScheduleConflicts(resources, jobs, assignments);
  return { resources, jobs, assignments, conflicts };
}
