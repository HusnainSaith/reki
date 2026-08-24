import { BusinessGuard } from './business.guard';
import { NoGuestGuard } from './no-guest.guard';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '../enums';

const mockContext = (user: any) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
  getHandler: () => jest.fn(),
  getClass: () => jest.fn(),
}) as any;

describe('BusinessGuard', () => {
  const guard = new BusinessGuard();

  it('allows business users', () => {
    expect(guard.canActivate(mockContext({ role: Role.BUSINESS }))).toBe(true);
  });

  it('blocks non-business users', () => {
    expect(() => guard.canActivate(mockContext({ role: Role.USER }))).toThrow(ForbiddenException);
  });
});

describe('NoGuestGuard', () => {
  const guard = new NoGuestGuard();

  it('allows non-guest users', () => {
    expect(guard.canActivate(mockContext({ role: Role.USER }))).toBe(true);
  });

  it('blocks guest users', () => {
    expect(() => guard.canActivate(mockContext({ role: Role.GUEST }))).toThrow(ForbiddenException);
  });
});

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: Role.USER }))).toBe(true);
  });

  it('allows matching role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(mockContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('blocks non-matching role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(mockContext({ role: Role.USER }))).toBe(false);
  });
});
