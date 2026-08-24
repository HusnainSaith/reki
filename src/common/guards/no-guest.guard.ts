import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../enums';

/**
 * Guard that blocks guest users from accessing endpoints.
 * Use on routes like save venue, redeem offer, notifications.
 */
@Injectable()
export class NoGuestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.role === Role.GUEST) {
      throw new ForbiddenException('Guest users cannot access this feature. Please register or login.');
    }
    return true;
  }
}
