import {
  Controller,
  Get,
  Post,
  Patch,
  Req,
  Res,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { FindIdDto } from './dto/find-id.dto';
import { FindPwDto } from './dto/find-pw.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
  @ApiResponse({
    status: 302,
    description: '카카오 로그인 페이지로 리다이렉트',
  })
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
  @ApiResponse({
    status: 200,
    description:
      '로그인 성공 (refreshToken은 쿠키에 설정, accessToken은 /auth/refresh로 받기)',
  })
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

      const { refreshToken } = await this.authService.kakaoLogin(code);

      // Refresh Token만 HttpOnly Cookie에 저장
      // 크로스 도메인 쿠키 전송을 위해 sameSite: 'none' 사용 (HTTPS 필수)
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      // iOS Safari 호환성을 위한 쿠키 설정
      // domain을 명시하지 않으면 현재 도메인에만 설정되어 서브도메인 문제 방지
      // iOS Safari는 SameSite=None일 때 Secure가 필수이므로 항상 secure: true 설정
      const cookieOptions: any = {
        httpOnly: true,
        secure: isProduction, // HTTPS에서만 작동 (iOS Safari 필수)
        sameSite: isProduction ? 'none' : 'lax', // 프로덕션에서는 크로스 도메인 허용
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        path: '/', // 모든 경로에서 쿠키 사용 가능
        // domain을 명시하지 않음 (iOS Safari 호환성)
      };

      // 쿠키 설정
      res.cookie('refreshToken', refreshToken, cookieOptions);

      // iOS Safari를 위한 추가 헤더 설정 (리다이렉트 전에 설정)
      if (isProduction) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', frontendUrl);
      }

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

      // Access Token은 쿼리 파라미터로 전달하지 않음 (보안)
      // 프론트엔드에서 /auth/refresh를 호출하여 받아야 함
      // 타임스탬프 추가로 캐시 방지 및 iOS Safari 호환성 개선
      return res.redirect(
        `${frontendUrl}/auth/callback?success=true&t=${Date.now()}`,
      );
    } catch (error: any) {
      console.error('카카오 콜백 에러:', error);
      const errorMessage = error.message || '로그인 실패';
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      return res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(errorMessage)}`,
      );
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
  async getMe(@Req() req: { user: Record<string, unknown> }) {
    const { password: _p, ...rest } = req.user;
    return rest;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '토큰 갱신',
    description:
      'Refresh Token으로 새 Access Token을 발급받습니다. Refresh Token은 쿠키에서 읽고, Access Token은 응답 body로 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
    schema: { properties: { accessToken: { type: 'string' } } },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token 없음 또는 유효하지 않음',
  })
  async refresh(@Req() req: Request, @Res() res: Response) {
    // 쿠키 확인 (디버깅용)
    const allCookies = req.cookies || {};
    const refreshToken = allCookies.refreshToken;

    // iOS Safari 디버깅을 위한 로그
    const userAgent = req.headers['user-agent'] || '';
    const isIOSSafari = /iPad|iPhone|iPod/.test(userAgent);

    console.log('Refresh 요청 - 쿠키 확인:', {
      hasRefreshToken: !!refreshToken,
      allCookies: Object.keys(allCookies),
      isIOSSafari,
      userAgent: userAgent.substring(0, 100), // 처음 100자만
    });

    if (!refreshToken) {
      console.error('Refresh token not found in cookies');
      return res.status(401).json({
        message: 'Refresh token not found',
        debug: isIOSSafari
          ? {
              cookiesReceived: Object.keys(allCookies),
              isIOSSafari: true,
            }
          : undefined,
      });
    }

    try {
      const { accessToken } = await this.authService.refreshToken(refreshToken);
      console.log('토큰 갱신 성공');
      // Access Token을 응답 body로 반환 (메모리 저장용)
      return res.json({ accessToken });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Token refresh failed';
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
    description:
      'Refresh Token 쿠키를 삭제합니다. Access Token은 클라이언트 메모리에서 제거해야 합니다.',
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

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '일반 회원가입',
    description: '아이디·비밀번호·이메일·닉네임으로 회원가입',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 400, description: '유효성 검증 실패' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 아이디/이메일' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: { id: user.id, loginId: user.loginId, nickname: user.nickname },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ApiOperation({
    summary: '일반 로그인',
    description:
      '아이디·비밀번호 로그인. refreshToken은 쿠키, accessToken·user는 body로 반환',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '아이디/비밀번호 오류' })
  async login(
    @Req()
    req: {
      user: {
        id: string;
        kakaoId: string | null;
        email: string | null;
        loginId: string | null;
      };
    },
    @Res() res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.localLogin(req.user);
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    const { password: _p, ...safeUser } = user;
    return res.json({ accessToken, user: safeUser });
  }

  @Post('find-id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ID 찾기',
    description: '이메일로 가입된 로그인 아이디 전체 반환',
  })
  @ApiBody({ type: FindIdDto })
  @ApiResponse({ status: 200, description: '아이디 조회 성공' })
  @ApiResponse({ status: 400, description: '해당 이메일 계정 없음' })
  async findId(@Body() dto: FindIdDto) {
    return this.authService.findId(dto.email);
  }

  @Post('find-pw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PW 찾기',
    description: '아이디·이메일 일치 시 임시 비밀번호 발급(응답으로 반환)',
  })
  @ApiBody({ type: FindPwDto })
  @ApiResponse({ status: 200, description: '임시 비밀번호 발급' })
  @ApiResponse({ status: 400, description: '일치하는 계정 없음' })
  async findPw(@Body() dto: FindPwDto) {
    return this.authService.findPw(dto.email, dto.loginId);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '비밀번호 변경',
    description: '일반 계정만. 현재 비밀번호 확인 후 새 비밀번호로 변경',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiResponse({ status: 400, description: '일반 계정이 아님' })
  @ApiResponse({
    status: 401,
    description: '현재 비밀번호 불일치 또는 인증 필요',
  })
  async changePassword(
    @Req() req: { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true, message: '비밀번호가 변경되었습니다.' };
  }
}
