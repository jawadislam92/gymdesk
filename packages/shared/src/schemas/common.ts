import { z } from 'zod';

/** UUID path/param validation. */
export const uuidSchema = z.string().uuid();

/** Standard list query: pagination, sort, free-text search. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  search: z.string().trim().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Shape of a paginated API response body. */
export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
