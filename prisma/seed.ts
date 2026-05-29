import { PrismaClient, JobStatus, ResourceType } from "@prisma/client";

const prisma = new PrismaClient();

const day = (date: string) => new Date(`${date}T08:00:00.000Z`);
const at = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`);

async function main() {
  await prisma.assignment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.resource.deleteMany();

  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        name: "Telcyte Construction Crew A",
        type: ResourceType.CREW,
        tags: "construction,in-house",
        notes: "Primary Cox construction crew"
      }
    }),
    prisma.resource.create({
      data: {
        name: "Bore Rig 1",
        type: ResourceType.EQUIPMENT,
        tags: "boring,equipment",
        notes: "Used for bore-dependent construction work"
      }
    }),
    prisma.resource.create({
      data: {
        name: "Traffic Control Partner",
        type: ResourceType.SUBCONTRACTOR,
        tags: "tcp,trax,traffic",
        notes: "Example traffic control subcontractor"
      }
    }),
    prisma.resource.create({
      data: {
        name: "Inactive Bucket Truck",
        type: ResourceType.EQUIPMENT,
        active: false,
        tags: "equipment,inactive",
        notes: "Seeded to prove inactive-resource conflict detection"
      }
    }),
    ...Array.from({ length: 40 }, (_, index) =>
      prisma.resource.create({
        data: {
          name: `Barker Technician ${String(index + 1).padStart(2, "0")}`,
          type: ResourceType.PERSON,
          tags: index % 3 === 0 ? "plumbing" : index % 3 === 1 ? "drains" : "install",
          notes: "Monthly technician scheduling seed"
        }
      })
    )
  ]);

  const [crewA, boreRig, trafficPartner, inactiveTruck, tech01, tech02, tech03] = resources;

  const telcyteJob = await prisma.job.create({
    data: {
      title: "CX Vault Lid Replacement",
      projectRef: "CX-1042",
      startsAt: at("2026-06-02", 8),
      endsAt: at("2026-06-02", 16),
      status: JobStatus.SCHEDULED,
      workType: "Work Notification / TCP",
      requiresEquipment: true,
      notes: "Telcyte example: crew and bore rig assigned"
    }
  });

  const telcyteConflict = await prisma.job.create({
    data: {
      title: "CX Fiber Storage Dig Down",
      projectRef: "CX-1043",
      startsAt: at("2026-06-02", 12),
      endsAt: at("2026-06-02", 18),
      status: JobStatus.SCHEDULED,
      workType: "Construction",
      requiresEquipment: true,
      notes: "Intentional conflict with Bore Rig 1"
    }
  });

  const inactiveAssignmentJob = await prisma.job.create({
    data: {
      title: "Aerial Pull Transfer",
      projectRef: "CX-1044",
      startsAt: at("2026-06-03", 8),
      endsAt: at("2026-06-03", 14),
      status: JobStatus.SCHEDULED,
      workType: "Aerial",
      requiresEquipment: true,
      notes: "Intentional inactive-equipment assignment"
    }
  });

  const unassignedJob = await prisma.job.create({
    data: {
      title: "Unassigned Work Notification",
      projectRef: "CX-1045",
      startsAt: at("2026-06-04", 9),
      endsAt: at("2026-06-04", 12),
      status: JobStatus.SCHEDULED,
      workType: "Work Notification",
      requiresEquipment: false,
      notes: "Intentional unassigned job"
    }
  });

  const barkerShift = await prisma.job.create({
    data: {
      title: "Barker Monthly Route - Plumbing",
      projectRef: "BARKER-JUNE",
      startsAt: day("2026-06-05"),
      endsAt: at("2026-06-05", 17),
      status: JobStatus.SCHEDULED,
      workType: "Technician Shift",
      notes: "Barker monthly schedule example"
    }
  });

  const barkerOverlap = await prisma.job.create({
    data: {
      title: "Barker Emergency Coverage",
      projectRef: "BARKER-JUNE",
      startsAt: at("2026-06-05", 13),
      endsAt: at("2026-06-05", 18),
      status: JobStatus.SCHEDULED,
      workType: "Technician Shift",
      notes: "Intentional technician overlap"
    }
  });

  await prisma.assignment.createMany({
    data: [
      { jobId: telcyteJob.id, resourceId: crewA.id, role: "Crew" },
      { jobId: telcyteJob.id, resourceId: boreRig.id, role: "Equipment" },
      { jobId: telcyteJob.id, resourceId: trafficPartner.id, role: "Traffic" },
      { jobId: telcyteConflict.id, resourceId: crewA.id, role: "Crew" },
      { jobId: telcyteConflict.id, resourceId: boreRig.id, role: "Equipment" },
      { jobId: inactiveAssignmentJob.id, resourceId: inactiveTruck.id, role: "Equipment" },
      { jobId: barkerShift.id, resourceId: tech01.id, role: "Technician" },
      { jobId: barkerShift.id, resourceId: tech02.id, role: "Technician" },
      { jobId: barkerOverlap.id, resourceId: tech01.id, role: "Technician" },
      { jobId: barkerOverlap.id, resourceId: tech03.id, role: "Technician" }
    ]
  });

  console.log("Seeded Capacity Scheduler data.");
  console.log(`Unassigned seed job: ${unassignedJob.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
