import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS 설정
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  // Cookie Parser
  app.use(cookieParser());

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('햄버거 모음 API')
    .setDescription(`
## 햄버거 브랜드별 메뉴/영양정보 탐색 및 커뮤니티 API

### 주요 기능
- **브랜드/메뉴 조회**: 7개 브랜드 (맥도날드, 버거킹, 롯데리아, 맘스터치, KFC, 노브랜드버거, 프랭크버거)
- **매장 찾기**: 카카오 로컬 API 기반 주변 매장 검색
- **인증**: 카카오 OAuth 로그인
- **게시판**: 게시글/댓글 CRUD (로그인 필요)

### 인증
- 게시글/댓글 조회는 인증 없이 가능
- 게시글/댓글 작성/수정/삭제는 JWT 인증 필요
- 로그인: \`GET /auth/kakao\` → 카카오 로그인 페이지로 리다이렉트
    `)
    .setVersion('1.0')
    .addTag('health', '서버 상태 확인 API')
    .addTag('brands', '브랜드 관련 API')
    .addTag('menu-items', '메뉴 관련 API')
    .addTag('stores', '매장 찾기 API')
    .addTag('auth', '인증 관련 API')
    .addTag('posts', '게시글 API')
    .addTag('comments', '댓글 API')
    .addTag('favorites', '즐겨찾기 API')
    .addTag('users', '사용자 API')
    .addTag('admin', '관리자 API (메뉴 수집)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT 토큰을 입력하세요',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger API Docs: http://localhost:${port}/api-docs`);
}
bootstrap();
