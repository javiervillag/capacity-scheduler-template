import { expect, test } from "@playwright/test";

test("main scheduling flows work in the browser", async ({ page }) => {
  const suffix = Date.now();
  const resourceName = `E2E Technician ${suffix}`;
  const equipmentName = `E2E Lift ${suffix}`;
  const firstJob = `E2E Morning Job ${suffix}`;
  const secondJob = `E2E Overlap Job ${suffix}`;
  const scheduledDay = String(2 + (suffix % 20)).padStart(2, "0");
  const movedDay = String(Number(scheduledDay) + 1).padStart(2, "0");
  const scheduledDate = `2026-11-${scheduledDay}`;
  const movedDate = `2026-11-${movedDay}`;

  await page.goto("/");
  await expect(page.getByTestId("schedule-workspace")).toBeVisible();
  await expect(page.getByTestId("app-ready")).toBeAttached();

  await page.getByRole("button", { name: "New Resource" }).click();
  await page.getByTestId("resource-name").fill(resourceName);
  await page.getByTestId("resource-type").selectOption("PERSON");
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByText("Resource created.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "New Resource" }).click();
  await page.getByTestId("resource-name").fill(equipmentName);
  await page.getByTestId("resource-type").selectOption("EQUIPMENT");
  await page.getByRole("button", { name: "Add resource" }).click();
  await expect(page.getByText("Resource created.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "New Job" }).click();
  await page.getByTestId("job-title").fill(firstJob);
  await page.getByTestId("job-start").fill(`${scheduledDate}T08:00`);
  await page.getByTestId("job-end").fill(`${scheduledDate}T10:00`);
  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.getByText("Job created.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "New Job" }).click();
  await page.getByTestId("job-title").fill(secondJob);
  await page.getByTestId("job-start").fill(`${scheduledDate}T09:00`);
  await page.getByTestId("job-end").fill(`${scheduledDate}T11:00`);
  await page.getByRole("button", { name: "Add job" }).click();
  await expect(page.getByText("Job created.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await page.getByTestId("assign-job").selectOption({ label: firstJob });
  await page.getByTestId("assign-resource-type").selectOption("ALL");
  await page.getByTestId(`assign-resource-${resourceName}`).check();
  await page.getByTestId(`assign-resource-${equipmentName}`).check();
  await page.getByRole("button", { name: "Assign selected resources" }).click();
  await expect(page.getByText("Resources assigned.")).toBeVisible();

  await page.getByTestId("assign-job").selectOption({ label: secondJob });
  await page.getByTestId(`assign-resource-${resourceName}`).check();
  await page.getByRole("button", { name: "Assign selected resources" }).click();
  await expect(page.getByText("Resources assigned.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "month", exact: true }).click();
  await expect(page.getByTestId("month-view")).toBeVisible();
  await expect(page.getByTestId("month-conflict-summary")).toContainText("blocking");
  await expect(page.getByTestId(`job-conflict-${firstJob}`)).toBeVisible();

  await page.getByTestId(`job-conflict-${firstJob}`).click();
  await expect(page.getByTestId("job-conflict-panel")).toContainText(`${resourceName} is double-booked`);
  await page.getByRole("button", { name: "Move later job after earlier job" }).click();
  await expect(page.getByText("Schedule updated.")).toBeVisible();
  await expect(page.getByText(new RegExp(`${resourceName} is double-booked`))).toHaveCount(0);
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "month", exact: true }).click();
  await expect(page.getByTestId("month-view")).toBeVisible();
  const originalDay = page.getByTestId(`calendar-day-${scheduledDate}`);
  await expect(originalDay.getByTestId(`job-card-${firstJob}`)).toBeVisible();
  await originalDay.getByTestId(`job-card-${firstJob}`).dragTo(page.getByTestId(`calendar-day-${movedDate}`));
  await expect(page.getByText("Schedule updated.")).toBeVisible();
  await expect(page.getByTestId(`calendar-day-${movedDate}`)).toContainText(firstJob);

  await page.getByRole("button", { name: "week", exact: true }).click();
  await expect(page.getByTestId("week-view")).toBeVisible();

  await page.getByRole("button", { name: "Resources", exact: true }).click();
  await expect(page.getByTestId("resource-view")).toBeVisible();
  await page.getByText(resourceName).click();
  await expect(page.getByRole("heading", { name: "Edit resource" })).toBeVisible();
  await page.getByRole("button", { name: "Save resource" }).click();
  await expect(page.getByText("Resource updated.")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("delete-resource").click();
  await expect(page.getByText("Resource deleted.")).toBeVisible();

  await page.getByRole("button", { name: "Docs", exact: true }).click();
  await expect(page.getByTestId("docs-view")).toBeVisible();
  await expect(page.getByText("CSV is intentionally not the live database")).toBeVisible();
  await expect(page.getByText("/api/bootstrap")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Data", exact: true }).click();
  await expect(page.getByTestId("data-workspace")).toBeVisible();
  await expect(page.getByTestId("import-export-view")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByTestId("export-resources").click();
  expect((await download).suggestedFilename()).toBe("resources.csv");

  await page.getByTestId("csv-input").fill("name,type\nBad Resource,NOPE");
  await page.getByRole("button", { name: "Validate and import" }).click();
  await expect(page.getByTestId("import-errors")).toContainText("type is invalid");
});
