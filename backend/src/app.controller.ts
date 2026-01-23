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
}
