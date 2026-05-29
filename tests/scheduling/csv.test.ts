import { describe, expect, it } from "vitest";
import { parseCsv, requireColumns, toCsv } from "@/lib/csv/csv";
import { validateJobRows, validateResourceRows } from "@/lib/csv/validators";

describe("CSV helpers", () => {
  it("reports missing required columns", () => {
    const parsed = parseCsv("name\nTest Tech");
    expect(requireColumns(parsed.rows, ["name", "type"])).toEqual(["type"]);
  });

  it("reports invalid job dates", () => {
    const parsed = parseCsv("title,startsAt,endsAt\nBad Job,nope,2026-06-01T08:00:00Z");
    expect(validateJobRows(parsed.rows)).toContain("Row 2: startsAt is invalid.");
  });

  it("reports duplicate resource names", () => {
    const parsed = parseCsv("name,type\nTech A,PERSON\nTech A,PERSON");
    expect(validateResourceRows(parsed.rows)).toContain("Row 3: duplicate resource name/type in CSV.");
  });

  it("exports CSV that can be imported back without required data loss", () => {
    const csv = toCsv([{ name: "Tech A", type: "PERSON", active: true }]);
    const parsed = parseCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({ name: "Tech A", type: "PERSON", active: "true" });
  });
});
