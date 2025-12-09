export interface RemarkItemDto {
  id: number;
  title: string;
  message: string;
  attachmentId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRemarksDto {
  data: RemarkItemDto[];
  meta: {
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}
