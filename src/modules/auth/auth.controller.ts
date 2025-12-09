import { Controller, Post, Body, Get, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly cookieMaxAge = 7 * 24 * 60 * 60 * 1000;

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);

    this.setAuthCookies(res, result.accessToken, result.user);

    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    this.setAuthCookies(res, result.accessToken, result.user);

    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear session' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);

    return {
      message: 'Logged out successfully',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private setAuthCookies(res: Response, accessToken: string, user: PublicUser) {
    const secure = this.isProduction;

    // HTTP-only token cookie for backend auth
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: this.cookieMaxAge,
    });

    // Non-HTTP-only token for frontend-managed access (same value as accessToken)
    res.cookie('vistra_token', accessToken, {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      maxAge: this.cookieMaxAge,
    });

    // Readable cookie to keep user info available to the frontend
    res.cookie('vistra_user', JSON.stringify(user), {
      httpOnly: false,
      secure,
      sameSite: 'strict',
      maxAge: this.cookieMaxAge,
    });
  }

  private clearAuthCookies(res: Response) {
    const baseOptions = {
      secure: this.isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };

    res.clearCookie('accessToken', {
      ...baseOptions,
      httpOnly: true,
    });

    ['vistra_token', 'vistra_user'].forEach((cookieName) => {
      res.clearCookie(cookieName, baseOptions);
    });
  }
}
