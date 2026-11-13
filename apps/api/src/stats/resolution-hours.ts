export interface ResolvedWithTimes {
  createdAt: Date;
  request: { createdAt: Date };
}

export function averageResolutionHours(resolvedWithTimes: ResolvedWithTimes[]): number | null {
  if (resolvedWithTimes.length === 0) return null;
  const durations = resolvedWithTimes.map((l) => (l.createdAt.getTime() - l.request.createdAt.getTime()) / 36e5);
  return Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;
}
