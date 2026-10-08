export function groupApiMinutes(series) {
  return Array.from({ length: Math.ceil(series.length / 5) }, (_, index) => {
    const minutes = series.slice(index * 5, index * 5 + 5);
    return {
      start: minutes[0].minute,
      end: minutes.at(-1).minute,
      requests: minutes.reduce((sum, point) => sum + Number(point.requests || 0), 0),
      errors: minutes.reduce((sum, point) => sum + Number(point.errors || 0), 0),
    };
  });
}
