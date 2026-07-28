import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentChurch = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const securityContext = request.securityContext;

    if (!securityContext || !securityContext.churchId) {
      throw new UnauthorizedException(
        'No se encontro el contexto de seguridad',
      );
    }

    return securityContext.churchId;
  },
);

export const CurrentWorkspace = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const securityContext = request.securityContext;

    if (!securityContext || !securityContext.workspaceId) {
      throw new UnauthorizedException('No se encontro el workspace activo');
    }

    return securityContext.workspaceId;
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.securityContext;
  },
);
