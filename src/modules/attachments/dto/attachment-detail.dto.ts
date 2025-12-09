import { AttachmentListItemDto } from './attachment-response.dto';
import { PaginatedLogsDto } from '../../logs/dto/log-response.dto';

export interface AttachmentDetailDto {
  attachment: AttachmentListItemDto;
  logs: PaginatedLogsDto;
}
