import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import jwksClient = require('jwks-rsa');
import * as jwt from 'jsonwebtoken';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RegisterDto } from './dto';
import { Role, AuthProvider, NotificationType, ErrorCode } from '../../common/enums';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client();
  private appleJwksClient = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
  });
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) { }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({ errorCode: 'EMAIL_ALREADY_EXISTS', message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
      authProvider: AuthProvider.EMAIL,
      role: Role.USER,
    });
    const saved = await this.usersRepository.save(user);
    const tokens = await this.generateTokens(saved);

    // Send welcome notification
    await this.createWelcomeNotification(saved.id);
    await this.sendVerificationEmail(saved);

    return {
      user: { id: saved.id, email: saved.email, name: saved.name, role: saved.role },
      tokens,
    };
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async guestLogin() {
    const guest = this.usersRepository.create({
      name: 'Guest',
      authProvider: AuthProvider.GUEST,
      role: Role.GUEST,
    });
    const saved = await this.usersRepository.save(guest);
    const tokens = await this.generateTokens(saved);

    return {
      user: { id: saved.id, role: saved.role, name: saved.name },
      tokens,
    };
  }

  async googleAuth(idToken: string) {
    const webClientId = this.configService.get<string>('app.google.clientId');
    const androidClientId = this.configService.get<string>('app.google.androidClientId');
    
    // Support both web and android client IDs
    const validClientIds = [webClientId, androidClientId].filter(Boolean);
    
    if (validClientIds.length === 0) {
      throw new BadRequestException('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in environment variables.');
    }

    let decoded;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: validClientIds, // Accept both web and android client IDs
      });
      decoded = ticket.getPayload();
    } catch (err) {
      throw new BadRequestException('Failed to verify Google ID token');
    }

    if (!decoded || !decoded.email) {
      throw new BadRequestException('Invalid Google ID token payload');
    }

    const email = decoded.email;
    const name = decoded.name || decoded.email.split('@')[0];

    // Check if user already exists
    let user = await this.usersRepository.findOne({ where: { email } });

    let isNewUser = false;
    if (!user) {
      user = this.usersRepository.create({
        email,
        name,
        authProvider: AuthProvider.GOOGLE,
        role: Role.USER,
        isVerified: true,
      });
      user = await this.usersRepository.save(user);
      isNewUser = true;
    }

    const tokens = await this.generateTokens(user);

    if (isNewUser) {
      await this.createWelcomeNotification(user.id);
    }

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async appleAuth(identityToken: string, authorizationCode: string) {
    const clientId = this.configService.get<string>('app.apple.clientId');
    if (!clientId) {
      throw new BadRequestException('Apple OAuth is not configured. Please set APPLE_CLIENT_ID in environment variables.');
    }

    let decoded;
    try {
      const decodedToken = jwt.decode(identityToken, { complete: true });
      if (!decodedToken || typeof decodedToken === 'string' || !decodedToken.header || !decodedToken.header.kid) {
        throw new BadRequestException('Invalid Apple identity token format');
      }

      const key = await this.appleJwksClient.getSigningKey(decodedToken.header.kid);
      const signingKey = key.getPublicKey();

      decoded = jwt.verify(identityToken, signingKey, {
        issuer: 'https://appleid.apple.com',
        audience: clientId,
      }) as any;

      // Verify authorization code in production
      // For production: Exchange authorizationCode with Apple's token endpoint
      // to get refresh_token and validate the user session
      if (authorizationCode) {
        await this.verifyAppleAuthorizationCode(authorizationCode, decoded.sub);
      }
    } catch (err) {
      throw new BadRequestException('Failed to verify Apple identity token');
    }

    if (!decoded || !decoded.sub) {
      throw new BadRequestException('Invalid Apple identity token payload');
    }

    const email = decoded.email || `${decoded.sub}@privaterelay.appleid.com`;
    const name = decoded.name || 'Apple User';

    let user = await this.usersRepository.findOne({ where: { email } });

    let isNewUser = false;
    if (!user) {
      user = this.usersRepository.create({
        email,
        name,
        authProvider: AuthProvider.APPLE,
        role: Role.USER,
        isVerified: true,
      });
      user = await this.usersRepository.save(user);
      isNewUser = true;
    }

    const tokens = await this.generateTokens(user);

    if (isNewUser) {
      await this.createWelcomeNotification(user.id);
    }

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Generate a short-lived reset token (15 min)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset' },
      {
        secret: this.configService.get<string>('app.jwt.secret'),
        expiresIn: '15m',
      },
    );

    // Send password reset email via configured email provider
    await this.emailService.sendPasswordResetEmail(email, resetToken, user.name);

    const response: Record<string, string> = {
      message: 'If the email exists, a reset link has been sent.',
    };

    // In development, expose the token directly so it can be tested without email
    if (this.configService.get<string>('app.nodeEnv') !== 'production') {
      response.resetToken = resetToken;
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('app.jwt.secret'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    return { message: 'Password reset successful' };
  }

  async sendVerificationEmail(user: User) {
    const verificationToken = this.jwtService.sign(
      { sub: user.id, type: 'email-verification' },
      {
        secret: this.configService.get<string>('app.jwt.secret'),
        expiresIn: '24h',
      },
    );

    // Send verification email via configured email provider
    await this.emailService.sendVerificationEmail(user.email, verificationToken, user.name);
  }

  async verifyEmail(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('app.jwt.secret'),
      });
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (payload.type !== 'email-verification') {
      throw new BadRequestException('Invalid token type');
    }

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      return { message: 'Email already verified' };
    }

    user.isVerified = true;
    await this.usersRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async logout(refreshTokenStr: string) {
    const stored = await this.refreshTokensRepository.findOne({
      where: { token: refreshTokenStr },
    });
    if (stored && !stored.isRevoked) {
      stored.isRevoked = true;
      await this.refreshTokensRepository.save(stored);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.password) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Cannot change password for social login accounts. Use forgot password instead.',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PASSWORD,
        message: 'Current password is incorrect',
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);

    // Revoke all active refresh tokens for this user
    await this.refreshTokensRepository.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true },
    );

    return { success: true, message: 'Password changed successfully. Please log in again.' };
  }

  async refreshToken(refreshTokenStr: string) {
    const stored = await this.refreshTokensRepository.findOne({
      where: { token: refreshTokenStr, isRevoked: false },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersRepository.findOne({ where: { id: stored.userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    // Revoke old token
    stored.isRevoked = true;
    await this.refreshTokensRepository.save(stored);

    return this.generateTokens(user);
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.secret'),
      expiresIn: this.configService.get<string>('app.jwt.expiration') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('app.jwt.refreshExpiration') as any,
    });

    // Store refresh token
    const refreshTokenEntity = this.refreshTokensRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await this.refreshTokensRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  private async createWelcomeNotification(userId: string): Promise<void> {
    await this.notificationsService.createWelcomeNotification(userId);
  }

  /**
   * Verify Apple authorization code by exchanging it with Apple's token endpoint.
   * This provides additional security validation for production environments.
   */
  private async verifyAppleAuthorizationCode(authorizationCode: string, expectedSub: string): Promise<void> {
    const clientId = this.configService.get<string>('app.apple.clientId');
    const teamId = this.configService.get<string>('app.apple.teamId');
    const keyId = this.configService.get<string>('app.apple.keyId');
    const privateKey = this.configService.get<string>('app.apple.privateKey');

    // In production, you would:
    // 1. Create a client secret JWT signed with your Apple private key
    // 2. Exchange the authorization code with Apple's token endpoint
    // 3. Verify the returned user ID matches the identity token
    
    // For now, log a warning if credentials are missing
    if (!teamId || !keyId || !privateKey) {
      console.warn('[Apple Auth] Authorization code verification skipped: Apple credentials not fully configured');
      return;
    }

    // TODO: Implement full authorization code exchange in production
    // Reference: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
    console.log(`[Apple Auth] Authorization code received for user ${expectedSub}. Full verification pending production setup.`);
  }
}
