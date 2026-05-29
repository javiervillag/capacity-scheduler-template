import { describe, expect, it } from "vitest";
import { detectScheduleConflicts } from "@/lib/scheduling/conflicts";
import type { SchedulableAssignment, SchedulableJob, SchedulableResource } from "@/lib/scheduling/types";

const resource = (id: string, active = true, type: SchedulableResource["type"] = "PERSON"): SchedulableResource => ({
  id,
  name: id,
  type,
  active
});

const job = (
  id: string,
  startsAt: string,
  endsAt: string,
  extra: Partial<SchedulableJob> = {}
): SchedulableJob => ({
  id,
  title: id,
  startsAt,
  endsAt,
  status: "SCHEDULED",
  requiresEquipment: false,
  ...extra
});

const assignment = (jobId: string, resourceId: string): SchedulableAssignment => ({
  id: `${jobId}-${resourceId}`,
  jobId,
  resourceId
});

describe("detectScheduleConflicts", () => {
  it("flags the same resource on overlapping jobs", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("a", "2026-06-01T08:00:00Z", "2026-06-01T12:00:00Z"), job("b", "2026-06-01T11:00:00Z", "2026-06-01T13:00:00Z")],
      [assignment("a", "tech"), assignment("b", "tech")]
    );
    expect(conflicts.some((conflict) => conflict.type === "DOUBLE_BOOKED_RESOURCE")).toBe(true);
  });

  it("allows non-overlapping jobs for the same resource", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"), job("b", "2026-06-01T11:00:00Z", "2026-06-01T13:00:00Z")],
      [assignment("a", "tech"), assignment("b", "tech")]
    );
    expect(conflicts).toEqual([]);
  });

  it("allows a job starting exactly when another ends", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"), job("b", "2026-06-01T10:00:00Z", "2026-06-01T12:00:00Z")],
      [assignment("a", "tech"), assignment("b", "tech")]
    );
    expect(conflicts).toEqual([]);
  });

  it("allows a job ending exactly when another starts", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("a", "2026-06-01T10:00:00Z", "2026-06-01T12:00:00Z"), job("b", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")],
      [assignment("a", "tech"), assignment("b", "tech")]
    );
    expect(conflicts).toEqual([]);
  });

  it("flags end before start", () => {
    const conflicts = detectScheduleConflicts([resource("tech")], [job("bad", "2026-06-01T12:00:00Z", "2026-06-01T08:00:00Z")], [assignment("bad", "tech")]);
    expect(conflicts.some((conflict) => conflict.type === "INVALID_TIME_RANGE")).toBe(true);
  });

  it("flags same start and end time", () => {
    const conflicts = detectScheduleConflicts([resource("tech")], [job("bad", "2026-06-01T08:00:00Z", "2026-06-01T08:00:00Z")], [assignment("bad", "tech")]);
    expect(conflicts.some((conflict) => conflict.type === "INVALID_TIME_RANGE")).toBe(true);
  });

  it("ignores cancelled jobs in conflict checks", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("a", "2026-06-01T08:00:00Z", "2026-06-01T12:00:00Z"), job("b", "2026-06-01T09:00:00Z", "2026-06-01T11:00:00Z", { status: "CANCELLED" })],
      [assignment("a", "tech"), assignment("b", "tech")]
    );
    expect(conflicts).toEqual([]);
  });

  it("flags inactive resources on active jobs", () => {
    const conflicts = detectScheduleConflicts([resource("inactive", false)], [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")], [assignment("a", "inactive")]);
    expect(conflicts.some((conflict) => conflict.type === "INACTIVE_RESOURCE")).toBe(true);
  });

  it("flags equipment-required jobs without equipment", () => {
    const conflicts = detectScheduleConflicts([resource("tech")], [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z", { requiresEquipment: true })], [assignment("a", "tech")]);
    expect(conflicts.some((conflict) => conflict.type === "MISSING_EQUIPMENT")).toBe(true);
  });

  it("allows equipment-required jobs with assigned equipment", () => {
    const conflicts = detectScheduleConflicts([resource("rig", true, "EQUIPMENT")], [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z", { requiresEquipment: true })], [assignment("a", "rig")]);
    expect(conflicts).toEqual([]);
  });

  it("flags jobs with no assigned resources", () => {
    const conflicts = detectScheduleConflicts([resource("tech")], [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")], []);
    expect(conflicts.some((conflict) => conflict.type === "NO_ASSIGNMENTS")).toBe(true);
  });

  it("flags only the conflicting resource in a multi-resource job", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech"), resource("crew")],
      [job("a", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"), job("b", "2026-06-01T09:00:00Z", "2026-06-01T11:00:00Z")],
      [assignment("a", "tech"), assignment("a", "crew"), assignment("b", "tech")]
    );
    expect(conflicts.filter((conflict) => conflict.type === "DOUBLE_BOOKED_RESOURCE")).toHaveLength(1);
    expect(conflicts[0].resourceId).toBe("tech");
  });

  it("handles overnight jobs crossing midnight", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("night", "2026-06-01T22:00:00Z", "2026-06-02T06:00:00Z"), job("early", "2026-06-02T05:00:00Z", "2026-06-02T08:00:00Z")],
      [assignment("night", "tech"), assignment("early", "tech")]
    );
    expect(conflicts.some((conflict) => conflict.type === "DOUBLE_BOOKED_RESOURCE")).toBe(true);
  });

  it("handles month-boundary scheduling", () => {
    const conflicts = detectScheduleConflicts(
      [resource("tech")],
      [job("month-end", "2026-06-30T22:00:00Z", "2026-07-01T02:00:00Z"), job("july", "2026-07-01T03:00:00Z", "2026-07-01T06:00:00Z")],
      [assignment("month-end", "tech"), assignment("july", "tech")]
    );
    expect(conflicts).toEqual([]);
  });
});
