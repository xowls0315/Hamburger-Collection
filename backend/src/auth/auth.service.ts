import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async kakaoLogin(code: string) {
    try {
      const kakaoRestApiKey = this.configService.get('KAKAO_REST_API_KEY');
      const kakaoRedirectUri = this.configService.get('KAKAO_REDIRECT_URI');
      const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');

      // 환경 변수 확인
      if (!kakaoRestApiKey) {
        throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
      }
      if (!kakaoRedirectUri) {
        throw new Error('KAKAO_REDIRECT_URI가 설정되지 않았습니다.');
      }
      if (!jwtRefreshSecret) {
        throw new Error('JWT_REFRESH_SECRET이 설정되지 않았습니다.');
      }

      // 카카오 토큰 교환
      const kakaoClientSecret = this.configService.get('KAKAO_CLIENT_SECRET');

      const tokenData: any = {
        grant_type: 'authorization_code',
        client_id: kakaoRestApiKey,
        redirect_uri: kakaoRedirectUri,
        code,
      };

      // Client Secret이 있으면 추가 (일부 앱은 필수)
      if (kakaoClientSecret) {
        tokenData.client_secret = kakaoClientSecret;
      }

      const tokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        tokenData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        throw new Error('카카오 액세스 토큰을 받지 못했습니다.');
      }

      // 카카오 사용자 정보 조회
      const userResponse = await axios.get(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const kakaoUser = userResponse.data;
      const kakaoId = kakaoUser.id?.toString();
      if (!kakaoId) {
        throw new Error('카카오 사용자 ID를 가져오지 못했습니다.');
      }

      // DB에서 사용자 찾기 또는 생성
      let user = await this.usersService.findByKakaoId(kakaoId);
      if (!user) {
        user = await this.usersService.create({
          kakaoId,
          nickname: kakaoUser.kakao_account?.profile?.nickname || '사용자',
          profileImage:
            kakaoUser.kakao_account?.profile?.profile_image_url || null,
        });
      }

      // JWT 토큰 생성
      const payload = { sub: user.id, email: user.kakaoId };
      const jwtAccessToken = this.jwtService.sign(payload);
      const jwtRefreshToken = this.jwtService.sign(payload, {
        secret: jwtRefreshSecret,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      });

      return {
        user,
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
      };
    } catch (error: any) {
      // 에러 로깅
      console.error('카카오 로그인 에러:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException();
      }

      const newPayload = { sub: user.id, email: user.kakaoId };
      const newAccessToken = this.jwtService.sign(newPayload);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
