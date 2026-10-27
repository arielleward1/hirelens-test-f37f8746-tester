export interface PaginationInput {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function buildPaginationMeta(input: PaginationInput): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));

  return {
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}

export function getOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
