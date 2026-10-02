export function pageWindow(query = {}, defaultLimit = 20, maxLimit = 100) {
  const pageNum = Number.parseInt(query.page, 10);
  const limitNum = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, maxLimit) : defaultLimit;
  return { page, limit, offset: (page - 1) * limit };
}
