export interface DirectoryListItemDto {
  name: string;
  path: string;
  diskPath: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
}
