export class SearchQueryDto {
  q?: string;
  keyword?: string;
  search?: string;
  categoryId?: string;
  collectionType?: string;
  subcategoryName?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  sort?: string;
  page?: string;
  limit?: string;
  pageNum?: string;
  pageSize?: string;
  [key: string]: string | undefined;
}
