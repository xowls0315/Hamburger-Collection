import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import axios from 'axios';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

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
        // 프로필 이미지 URL이 http://로 시작하면 https://로 변환
        let profileImageUrl = kakaoUser.kakao_account?.profile?.profile_image_url || null;
        if (profileImageUrl && profileImageUrl.startsWith('http://')) {
          profileImageUrl = profileImageUrl.replace('http://', 'https://');
        }
        
        user = await this.usersService.create({
          kakaoId,
          nickname: kakaoUser.kakao_account?.profile?.nickname || '사용자',
          profileImage: profileImageUrl,
        });
      } else {
        // 기존 사용자의 프로필 이미지도 업데이트 (http -> https 변환)
        if (user.profileImage && user.profileImage.startsWith('http://')) {
          user.profileImage = user.profileImage.replace('http://', 'https://');
          await this.usersService.update(user.id, { profileImage: user.profileImage });
        }
      }

      // JWT 토큰 생성
      const payload = { sub: user.id, email: user.kakaoId ?? user.email ?? user.loginId };
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
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: unknown }; stack?: string };
      console.error('카카오 로그인 에러:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack,
      });
      throw error;
    }
  }

  /** 로컬 로그인 검증 (LocalStrategy용) */
  async validateUser(loginId: string, password: string) {
    return this.usersService.validateLocalUser(loginId, password);
  }

  /** 일반 회원가입 */
  async register(data: { loginId: string; password: string; email: string; nickname: string }) {
    return this.usersService.createLocal(data);
  }

  /** 로컬 로그인 후 JWT 발급 (쿠키는 컨트롤러에서 설정) */
  async localLogin(user: { id: string; kakaoId: string | null; email: string | null; loginId: string | null }) {
    const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET이 설정되지 않았습니다.');
    const payload = { sub: user.id, email: user.kakaoId ?? user.email ?? user.loginId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });
    const fullUser = await this.usersService.findOne(user.id);
    if (!fullUser) throw new UnauthorizedException();
    return { user: fullUser, accessToken, refreshToken };
  }

  /** ID 찾기: 이메일로 가입된 로그인 아이디 전체 반환 */
  async findId(email: string): Promise<{ loginId: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.loginId) {
      throw new BadRequestException('해당 이메일로 가입된 계정이 없습니다.');
    }
    return { loginId: user.loginId };
  }

  /** PW 찾기: 임시 비밀번호 생성 후 DB 저장, 평문 반환 (이메일 발송 없음) */
  async findPw(email: string, loginId: string): Promise<{ temporaryPassword: string }> {
    const user = await this.usersService.findByLoginId(loginId);
    if (!user || !user.email || user.email !== email) {
      throw new BadRequestException('아이디와 이메일이 일치하는 계정이 없습니다.');
    }
    const temp = crypto.randomBytes(4).toString('hex'); // 8자
    const hashed = await bcrypt.hash(temp, 10);
    await this.usersService.update(user.id, { password: hashed });
    return { temporaryPassword: temp };
  }

  /** 비밀번호 변경 (일반 계정만, 로그인 상태에서 현재 비밀번호 확인 후 변경) */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.password) {
      throw new BadRequestException('일반 계정만 비밀번호를 변경할 수 있습니다.');
    }
    const valid = await this.usersService.validateLocalUser(user.loginId!, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { password: hashed });
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

      const newPayload = { sub: user.id, email: user.kakaoId ?? user.email ?? user.loginId };
      const newAccessToken = this.jwtService.sign(newPayload);

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
