export type SmartsheetSchedulePayload = {
  resources: unknown[];
  jobs: unknown[];
  assignments: unknown[];
};

export async function syncToSmartsheet(_payload: SmartsheetSchedulePayload) {
  throw new Error(
    "Smartsheet sync is intentionally not implemented in the MVP. Add SMARTSHEET_ACCESS_TOKEN and target sheet IDs before enabling this integration."
  );
}
