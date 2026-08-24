import { Controller, Post, Get, Query, Body, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, GoogleAuthDto, AppleAuthDto, ForgotPasswordDto, ResetPasswordDto, LogoutDto, ChangePasswordDto } from './dto';
import { LocalAuthGuard, JwtAuthGuard } from './guards';
import { CurrentUser } from './decorators';
import { User } from '../users/entities/user.entity';
import { NoGuestGuard } from '../../common/guards';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Register new user (email/password)' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'User registered — returns access + refresh tokens' })
  @ApiBadRequestResponse({ description: 'Validation failed or email already in use' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (3/min)' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email/password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login success — returns access + refresh tokens' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (5/min)' })
  async login(@Body() _dto: LoginDto, @CurrentUser() user: User) {
    return this.authService.login(user);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login/Register with Google OAuth' })
  @ApiBody({ type: GoogleAuthDto })
  @ApiOkResponse({ description: 'Google auth success — tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google ID token' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto.idToken);
  }

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login/Register with Apple Sign-In' })
  @ApiBody({ type: AppleAuthDto })
  @ApiOkResponse({ description: 'Apple auth success — tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid Apple identity token' })
  async appleAuth(@Body() dto: AppleAuthDto) {
    return this.authService.appleAuth(dto.identityToken, dto.authorizationCode);
  }

  @Post('guest')
  @ApiOperation({ summary: 'Login as guest (limited access)' })
  @ApiCreatedResponse({ description: 'Guest token issued (role=guest, limited scope)' })
  async guestLogin() {
    return this.authService.guestLogin();
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiOkResponse({ description: 'Email verified' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'Reset email dispatched (always returns 200 to avoid user enumeration)' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (3/min)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ description: 'Token invalid or expired' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ description: 'New access + refresh tokens returned' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid or expired' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, NoGuestGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed — all sessions invalidated' })
  @ApiBadRequestResponse({ description: 'Old password incorrect or social login account' })
  @ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }
}
