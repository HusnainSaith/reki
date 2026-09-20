import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NoGuestGuard } from '../../common/guards';
import { Role } from '../../common/enums';
import { ExecutionContext } from '@nestjs/common';

const makeUser = (role: Role) => ({ id: 'u-1', email: 'a@b.com', role } as any);

const mockService: Partial<UsersService> = {
  getPreferences: jest.fn().mockResolvedValue({ vibes: [], music: [] }),
  savePreferences: jest.fn().mockResolvedValue({ success: true }),
  getSavedVenues: jest.fn().mockResolvedValue([]),
  saveVenue: jest.fn().mockResolvedValue({ saved: true }),
  unsaveVenue: jest.fn().mockResolvedValue({ removed: true }),
  getRedemptions: jest.fn().mockResolvedValue({ redemptions: [], total: 0 }),
  getProfile: jest.fn().mockResolvedValue({ id: 'u-1' }),
  setSelectedCity: jest.fn().mockResolvedValue({ selectedCity: 'manchester' }),
};

// Helper to test NoGuestGuard directly
function runNoGuestGuard(role: Role): boolean {
  const guard = new NoGuestGuard();
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  return guard.canActivate(ctx);
}

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(mockService as UsersService, {} as any);
  });

  // ─── NoGuestGuard unit tests ───────────────────────────────────────────────

  describe('NoGuestGuard', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'allows role %s',
      (role) => expect(runNoGuestGuard(role)).toBe(true),
    );

    it('blocks GUEST with ForbiddenException', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── GET /users/preferences ────────────────────────────────────────────────

  describe('GET /preferences', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN, Role.GUEST])(
      'role %s can call getPreferences',
      async (role) => {
        await controller.getPreferences(makeUser(role));
        expect(mockService.getPreferences).toHaveBeenCalledWith('u-1');
      },
    );
  });

  // ─── POST /users/preferences ───────────────────────────────────────────────

  describe('POST /preferences', () => {
    const dto = { vibes: ['Chill'], music: ['House'] };

    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'role %s can savePreferences',
      async (role) => {
        await controller.savePreferences(makeUser(role), dto);
        expect(mockService.savePreferences).toHaveBeenCalledWith('u-1', ['Chill'], ['House']);
      },
    );

    it('GUEST is blocked by NoGuestGuard', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── PUT /users/preferences ────────────────────────────────────────────────

  describe('PUT /preferences', () => {
    const dto = { vibes: ['Party'], music: [] };

    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'role %s can updatePreferences',
      async (role) => {
        await controller.updatePreferences(makeUser(role), dto);
        expect(mockService.savePreferences).toHaveBeenCalledWith('u-1', ['Party'], []);
      },
    );

    it('GUEST is blocked by NoGuestGuard', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── GET /users/saved-venues ───────────────────────────────────────────────

  describe('GET /saved-venues', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'role %s can getSavedVenues',
      async (role) => {
        await controller.getSavedVenues(makeUser(role));
        expect(mockService.getSavedVenues).toHaveBeenCalledWith('u-1');
      },
    );

    it('GUEST is blocked by NoGuestGuard', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── POST /users/saved-venues/:venueId ────────────────────────────────────

  describe('POST /saved-venues/:venueId', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'role %s can saveVenue',
      async (role) => {
        await controller.saveVenue(makeUser(role), 'v-1');
        expect(mockService.saveVenue).toHaveBeenCalledWith('u-1', 'v-1');
      },
    );

    it('GUEST is blocked by NoGuestGuard', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── DELETE /users/saved-venues/:venueId ──────────────────────────────────

  describe('DELETE /saved-venues/:venueId', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'role %s can unsaveVenue',
      async (role) => {
        await controller.unsaveVenue(makeUser(role), 'v-1');
        expect(mockService.unsaveVenue).toHaveBeenCalledWith('u-1', 'v-1');
      },
    );

    it('GUEST is blocked by NoGuestGuard', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── GET /users/redemptions ───────────────────────────────────────────────

  describe('GET /redemptions', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN])(
      'role %s can getRedemptions with pagination',
      async (role) => {
        await controller.getRedemptions(makeUser(role), '2', '5');
        expect(mockService.getRedemptions).toHaveBeenCalledWith('u-1', 2, 5);
      },
    );

    it('uses default page=1 limit=10 when params omitted', async () => {
      await controller.getRedemptions(makeUser(Role.USER));
      expect(mockService.getRedemptions).toHaveBeenCalledWith('u-1', 1, 10);
    });

    it('GUEST is blocked by NoGuestGuard', () => {
      expect(() => runNoGuestGuard(Role.GUEST)).toThrow(ForbiddenException);
    });
  });

  // ─── GET /users/profile ───────────────────────────────────────────────────

  describe('GET /profile', () => {
    it.each([Role.USER, Role.BUSINESS, Role.ADMIN, Role.GUEST])(
      'role %s can getProfile',
      async (role) => {
        await controller.getProfile(makeUser(role));
        expect(mockService.getProfile).toHaveBeenCalledWith('u-1');
      },
    );
  });
});
