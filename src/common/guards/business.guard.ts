import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../enums';

/**
 * Guard that ensures the user has business role.
 * Used on all /business/* routes.
 */
@Injectable()
export class BusinessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role !== Role.BUSINESS) {
      throw new ForbiddenException('Only business users can access this resource');
    }
    return true;
  }
}
