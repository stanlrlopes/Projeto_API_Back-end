import { api } from '../services/api';
import { PaginatedResponse } from '../types/api.types';

/**
 * Percorre todas as páginas de um endpoint paginado da EducaAPI,
 * garantindo suporte completo para cenários com mais de 100 registros.
 */
export async function fetchAllPages<T>(endpoint: string, pageSize = 100): Promise<T[]> {
  const firstPageResponse = await api.get<PaginatedResponse<T>>(endpoint, {
    params: { page: 1, limit: pageSize },
  });

  const { data: firstPageData, pagination } = firstPageResponse.data;
  if (!pagination || pagination.totalPages <= 1) {
    return firstPageData ?? [];
  }

  const allRecords: T[] = [...(firstPageData ?? [])];

  for (let currentPage = 2; currentPage <= pagination.totalPages; currentPage += 1) {
    const pageResponse = await api.get<PaginatedResponse<T>>(endpoint, {
      params: { page: currentPage, limit: pageSize },
    });
    if (pageResponse.data?.data) {
      allRecords.push(...pageResponse.data.data);
    }
  }

  return allRecords;
}
