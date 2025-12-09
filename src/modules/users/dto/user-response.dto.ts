import { Role } from '@prisma/client';

export class UserProfileDto {
  id: number;
  email: string;
  name: string;
  role: Role;
}
