import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: '서버 상태 확인',
    description: '서버가 정상적으로 동작하는지 확인합니다.',
  })
  @ApiResponse({ status: 200, description: '서버 정상 동작' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: '헬스 체크 (DB 포함)',
    description:
      '서버 및 DB 연결 상태 확인. UptimeRobot 5분 핑용으로 사용 시 Render sleep 방지 + Supabase 7일 pause 방지에 도움.',
  })
  @ApiResponse({
    status: 200,
    description: '정상',
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'connected' },
      },
    },
  })
  async getHealth() {
    return this.appService.checkHealth();
  }
}
