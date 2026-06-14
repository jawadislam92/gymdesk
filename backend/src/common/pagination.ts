import type { Paginated } from '@gymflow/shared';

export function skip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
