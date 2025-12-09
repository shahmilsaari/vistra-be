import type { Request } from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

type RequestWithUser = Request & {
  user?: JwtPayload;
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user ?? null;
});
