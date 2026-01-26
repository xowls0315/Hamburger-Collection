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
      '카카오 OAuth 콜백을 처리합니다. Refresh Token은 HttpOnly 쿠키로 설정합니다. Access Token은 프론트엔드에서 /auth/refresh 엔드포인트를 호출하여 받아야 합니다.',
  })
  @ApiQuery({ name: 'code', description: '카카오 인증 코드' })
  @ApiResponse({ status: 200, description: '로그인 성공 (refreshToken은 쿠키에 설정, accessToken은 /auth/refresh로 받기)' })
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

      const { refreshToken } =
        await this.authService.kakaoLogin(code);

      // Refresh Token만 HttpOnly Cookie에 저장
      // 크로스 도메인 쿠키 전송을 위해 sameSite: 'none' 사용 (HTTPS 필수)
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      
      // iOS Safari 호환성을 위한 쿠키 설정
      // iOS Safari는 SameSite=None일 때 Secure가 필수이므로 항상 secure: true 설정
      // domain을 명시하지 않으면 현재 도메인에만 설정되어 서브도메인 문제 방지
      const cookieOptions: any = {
        httpOnly: true,
        secure: isProduction, // HTTPS에서만 작동 (iOS Safari 필수)
        sameSite: isProduction ? 'none' : 'lax', // 프로덕션에서는 크로스 도메인 허용
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        path: '/', // 모든 경로에서 쿠키 사용 가능
        // domain을 명시하지 않음 (iOS Safari 호환성)
      };
      
      // iOS Safari를 위한 추가 헤더 설정 (리다이렉트 전에 설정)
      if (isProduction) {
        // CORS 헤더 명시적 설정
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', frontendUrl);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      }
      
      // 쿠키 설정
      res.cookie('refreshToken', refreshToken, cookieOptions);

      console.log('카카오 로그인 성공 - 쿠키 설정 완료:', {
        hasRefreshToken: !!refreshToken,
        isProduction,
        frontendUrl,
        cookieOptions: {
          httpOnly: cookieOptions.httpOnly,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
          path: cookieOptions.path,
        },
      });

      // iOS Safari에서 쿠키가 제대로 설정되도록 리다이렉트 전에 약간의 지연
      // 또는 프론트엔드에서 쿠키 설정을 확인할 수 있도록 추가 파라미터 전달
      // Access Token은 쿼리 파라미터로 전달하지 않음 (보안)
      // 프론트엔드에서 /auth/refresh를 호출하여 받아야 함
      return res.redirect(`${frontendUrl}/auth/callback?success=true&t=${Date.now()}`);
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
  async getMe(@Req() req: any) {
    return req.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '토큰 갱신',
    description:
      'Refresh Token으로 새 Access Token을 발급받습니다. Refresh Token은 쿠키에서 읽고, Access Token은 응답 body로 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '토큰 갱신 성공', schema: { properties: { accessToken: { type: 'string' } } } })
  @ApiResponse({ status: 401, description: 'Refresh token 없음 또는 유효하지 않음' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    // 쿠키 확인 (디버깅용)
    const allCookies = req.cookies || {};
    const refreshToken = allCookies.refreshToken;
    
    console.log('Refresh 요청 - 쿠키 확인:', {
      hasRefreshToken: !!refreshToken,
      allCookies: Object.keys(allCookies),
      userAgent: req.headers['user-agent'],
    });

    if (!refreshToken) {
      console.error('Refresh token not found in cookies');
      return res.status(401).json({ 
        message: 'Refresh token not found',
        debug: {
          cookiesReceived: Object.keys(allCookies),
          userAgent: req.headers['user-agent'],
        }
      });
    }

    try {
      const { accessToken } = await this.authService.refreshToken(refreshToken);
      console.log('토큰 갱신 성공');
      // Access Token을 응답 body로 반환 (메모리 저장용)
      return res.json({ accessToken });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      console.error('토큰 갱신 실패:', errorMessage);
      return res.status(401).json({ 
        message: errorMessage,
      });
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description: 'Refresh Token 쿠키를 삭제합니다. Access Token은 클라이언트 메모리에서 제거해야 합니다.',
  })
  @ApiResponse({ status: 200, description: '로그아웃 성공' })
  async logout(@Res() res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      // domain을 명시하지 않음 (iOS Safari 호환성)
    });
    return res.json({ success: true });
  }
}
