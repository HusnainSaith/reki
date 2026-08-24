import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(() => {
    authService = {
      register: jest.fn().mockResolvedValue({ user: { id: '1' }, tokens: {} }),
      login: jest.fn().mockResolvedValue({ user: { id: '1' }, tokens: {} }),
      googleAuth: jest.fn().mockResolvedValue({ user: { id: '1' }, tokens: {} }),
      appleAuth: jest.fn().mockResolvedValue({ user: { id: '1' }, tokens: {} }),
      guestLogin: jest.fn().mockResolvedValue({ user: { id: 'g1' }, tokens: {} }),
      forgotPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
      refreshToken: jest.fn().mockResolvedValue({ accessToken: 'new' }),
      verifyEmail: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    controller = new AuthController(authService as AuthService);
  });

  it('register', async () => {
    const result = await controller.register({ email: 'a@b.com', password: 'Pass1234', name: 'A' } as any);
    expect(authService.register).toHaveBeenCalled();
    expect(result).toHaveProperty('user');
  });

  it('login', async () => {
    const user = { id: '1', email: 'a@b.com' } as any;
    const result = await controller.login({ email: 'a@b.com', password: '123' }, user);
    expect(authService.login).toHaveBeenCalledWith(user);
    expect(result).toHaveProperty('user');
  });

  it('googleAuth', async () => {
    const result = await controller.googleAuth({ idToken: 'tok' } as any);
    expect(authService.googleAuth).toHaveBeenCalledWith('tok');
  });

  it('appleAuth', async () => {
    const result = await controller.appleAuth({ identityToken: 'tok', authorizationCode: 'code' } as any);
    expect(authService.appleAuth).toHaveBeenCalledWith('tok', 'code');
  });

  it('guestLogin', async () => {
    const result = await controller.guestLogin();
    expect(authService.guestLogin).toHaveBeenCalled();
  });

  it('forgotPassword', async () => {
    const result = await controller.forgotPassword({ email: 'a@b.com' });
    expect(authService.forgotPassword).toHaveBeenCalledWith('a@b.com');
  });

  it('resetPassword', async () => {
    const result = await controller.resetPassword({ token: 'tok', newPassword: 'New1234' } as any);
    expect(authService.resetPassword).toHaveBeenCalledWith('tok', 'New1234');
  });

  it('refreshToken', async () => {
    const result = await controller.refreshToken({ refreshToken: 'rt' });
    expect(authService.refreshToken).toHaveBeenCalledWith('rt');
  });

  it('verifyEmail', async () => {
    const result = await controller.verifyEmail('tok');
    expect(authService.verifyEmail).toHaveBeenCalledWith('tok');
  });
});
