interface Counter {
  count: number;
  lastUpdated: string;
}

const counters = new Map<string, Counter>();

export function incrementMetric(name: string, by = 1): number {
  const existing = counters.get(name) ?? { count: 0, lastUpdated: new Date().toISOString() };
  existing.count += by;
  existing.lastUpdated = new Date().toISOString();
  counters.set(name, existing);
  return existing.count;
}

export function getMetric(name: string): number {
  return counters.get(name)?.count ?? 0;
}

export function getAllMetrics(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [name, counter] of counters.entries()) {
    result[name] = counter.count;
  }
  return result;
}

export function resetMetrics(): void {
  counters.clear();
}

export function recordRequest(method: string, path: string, statusCode: number): void {
  incrementMetric("http.requests.total");
  incrementMetric(`http.requests.${statusCode}`);
  incrementMetric(`http.requests.${method.toLowerCase()}`);
  incrementMetric(`http.route.${method.toLowerCase()}.${path}`);
}
