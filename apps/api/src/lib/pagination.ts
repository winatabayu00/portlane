export function paginate(total: number, page: number, perPage: number) {
  const p = Math.max(1, page | 0);
  const pp = Math.min(100, Math.max(1, perPage | 0));
  return { page: p, per_page: pp, total, total_pages: Math.ceil(total / pp) };
}
export function clampPage(q: Record<string, unknown>) {
  return {
    page: parseInt(String((q.page as string) ?? "1"), 10) || 1,
    perPage: parseInt(String((q.per_page as string) ?? (q.perPage as string) ?? "25"), 10) || 25,
  };
}
