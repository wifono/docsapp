import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): { userId: number; email: string } | undefined => {
    const request = ctx.switchToHttp().getRequest<Express.Request>();
    return request.user;
  },
);
