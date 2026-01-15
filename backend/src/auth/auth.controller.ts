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
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('kakao')
  async kakaoLogin(@Res() res: Response) {
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${this.configService.get('KAKAO_REST_API_KEY')}&redirect_uri=${this.configService.get('KAKAO_REDIRECT_URI')}&response_type=code`;
    res.redirect(kakaoAuthUrl);
  }

  @Get('kakao/callback')
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

      // 백엔드 테스트용: JSON 응답 반환 (프론트엔드 연동 시 리다이렉트로 변경)
      return res.json({
        success: true,
        message: '카카오 로그인 성공',
        user: {
          id: user.id,
          kakaoId: user.kakaoId,
          nickname: user.nickname,
          profileImage: user.profileImage,
          role: user.role,
        },
        tokens: {
          accessToken, // 테스트용으로 토큰도 반환 (프로덕션에서는 제거)
          refreshToken, // 테스트용으로 토큰도 반환 (프로덕션에서는 제거)
        },
        cookies: {
          accessToken: '설정됨',
          refreshToken: '설정됨',
        },
      });
    } catch (error: any) {
      console.error('카카오 콜백 에러:', error);
      const errorMessage = error.message || '로그인 실패';
      const errorResponse = error.response?.data || {};

      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: {
          code: errorResponse.error || 'UNKNOWN_ERROR',
          description: errorResponse.error_description || errorMessage,
          errorCode: errorResponse.error_code || null,
        },
        details: errorResponse,
      });
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
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
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ success: true });
  }
}
