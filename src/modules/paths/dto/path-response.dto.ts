export interface PathResponseDto {
  id: number;
  name: string;
  parentId?: number;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
