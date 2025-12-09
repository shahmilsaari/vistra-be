import { AttachmentListItemDto } from './attachment-response.dto';

export interface DirectoryAttachmentsDto {
  data: AttachmentListItemDto[];
  meta: {
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}
