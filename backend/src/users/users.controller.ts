import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({
    summary: '사용자 정보 조회',
    description: '사용자 ID로 사용자 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', description: '사용자 ID (UUID)' })
  @ApiResponse({ status: 200, description: '사용자 정보 조회 성공' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
