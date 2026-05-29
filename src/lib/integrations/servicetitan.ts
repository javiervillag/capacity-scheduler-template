export type ServiceTitanSchedulePayload = {
  jobs: unknown[];
  technicians: unknown[];
};

export async function syncToServiceTitan(_payload: ServiceTitanSchedulePayload) {
  throw new Error(
    "ServiceTitan sync is intentionally not implemented in the MVP. Add tenant/client credentials and map job/technician IDs before enabling this integration."
  );
}
