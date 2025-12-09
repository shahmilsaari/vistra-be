import { DirectoryListItemDto } from './directory-response.dto';

export interface AttachmentListItemDto {
  id: number;
  name: string;
  kind: string;
  size: number;
  mime: string;
  storageKey: string;
  storageUrl: string;
  path: string;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  createdBy: {
    id: number;
    name: string;
  };
  updatedBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAttachmentsDto {
  directories: DirectoryListItemDto[];
  data: AttachmentListItemDto[];
  meta: {
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}
