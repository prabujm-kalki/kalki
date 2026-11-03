export function buildFilteredUrl(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
  currentScope: {
    organizationId?: string;
    locationId?: string | null;
    preset?: string;
    fromDate?: string;
    toDate?: string;
  }
): string {
  const query = new URLSearchParams();

  if (currentScope.organizationId) {
    query.set("organizationId", currentScope.organizationId);
  }

  if (currentScope.locationId && currentScope.locationId !== "ALL") {
    query.set("locationId", currentScope.locationId);
  }

  if (currentScope.preset) {
    query.set("preset", currentScope.preset);
  }

  if (currentScope.fromDate) {
    query.set("from", currentScope.fromDate);
  }

  if (currentScope.toDate) {
    query.set("to", currentScope.toDate);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
