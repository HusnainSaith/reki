import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeDefined();
  });
});

describe('LocalAuthGuard', () => {
  it('should be defined', () => {
    const guard = new LocalAuthGuard();
    expect(guard).toBeDefined();
  });
});
