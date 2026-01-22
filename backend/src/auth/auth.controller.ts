import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('kakao')
  @ApiOperation({
    summary: '카카오 로그인',
    description: '카카오 OAuth 로그인 페이지로 리다이렉트합니다.',
  })
  @ApiResponse({ status: 302, description: '카카오 로그인 페이지로 리다이렉트' })
  async kakaoLogin(@Res() res: Response) {
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${this.configService.get('KAKAO_REST_API_KEY')}&redirect_uri=${this.configService.get('KAKAO_REDIRECT_URI')}&response_type=code`;
    res.redirect(kakaoAuthUrl);
  }

  @Get('kakao/callback')
  @ApiOperation({
    summary: '카카오 로그인 콜백',
    description:
      '카카오 OAuth 콜백을 처리하고 JWT 토큰을 HttpOnly 쿠키로 설정합니다.',
  })
  @ApiQuery({ name: 'code', description: '카카오 인증 코드' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 400, description: '인증 코드 없음' })
  @ApiResponse({ status: 500, description: '로그인 실패' })
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      if (!code) {
        return res.status(400).json({
          success: false,
          message: '인증 코드가 없습니다.',
        });
      }

      const { user, accessToken, refreshToken } =
        await this.authService.kakaoLogin(code);

      // HttpOnly Cookie에 토큰 저장
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15분
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      });

      // 프론트엔드로 리다이렉트
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/callback?success=true`);
    } catch (error: any) {
      console.error('카카오 콜백 에러:', error);
      const errorMessage = error.message || '로그인 실패';
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '현재 로그인 유저 정보',
    description: 'JWT 토큰으로 인증된 현재 사용자 정보를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '사용자 정보 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getMe(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '토큰 갱신',
    description:
      'Refresh Token으로 새 Access Token을 발급받습니다. (쿠키 사용)',
  })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공' })
  @ApiResponse({ status: 401, description: 'Refresh token 없음 또는 유효하지 않음' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    const { accessToken } = await this.authService.refreshToken(refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ success: true });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description: 'Access Token과 Refresh Token 쿠키를 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ success: true });
  }
}
