import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({
    summary: '즐겨찾기 목록 조회',
    description: '로그인한 사용자의 즐겨찾기 목록을 조회합니다.',
  })
  @ApiResponse({ status: 200, description: '즐겨찾기 목록 조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  findAll(@Req() req: any) {
    return this.favoritesService.findAllByUserId(req.user.id);
  }

  @Post(':menuItemId')
  @ApiOperation({
    summary: '즐겨찾기 추가',
    description: '메뉴 아이템을 즐겨찾기에 추가합니다.',
  })
  @ApiParam({ name: 'menuItemId', description: '메뉴 아이템 ID (UUID)' })
  @ApiResponse({ status: 201, description: '즐겨찾기 추가 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '메뉴 아이템을 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '이미 즐겨찾기에 추가됨' })
  create(@Param('menuItemId') menuItemId: string, @Req() req: any) {
    return this.favoritesService.create(req.user.id, menuItemId);
  }

  @Delete(':menuItemId')
  @ApiOperation({
    summary: '즐겨찾기 삭제',
    description: '즐겨찾기에서 메뉴 아이템을 제거합니다.',
  })
  @ApiParam({ name: 'menuItemId', description: '메뉴 아이템 ID (UUID)' })
  @ApiResponse({ status: 200, description: '즐겨찾기 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '즐겨찾기를 찾을 수 없음' })
  async remove(@Param('menuItemId') menuItemId: string, @Req() req: any) {
    await this.favoritesService.remove(req.user.id, menuItemId);
  }

  @Get('check/:menuItemId')
  @ApiOperation({
    summary: '즐겨찾기 여부 확인',
    description: '특정 메뉴 아이템이 즐겨찾기에 있는지 확인합니다.',
  })
  @ApiParam({ name: 'menuItemId', description: '메뉴 아이템 ID (UUID)' })
  @ApiResponse({ status: 200, description: '즐겨찾기 여부 확인 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async checkFavorite(@Param('menuItemId') menuItemId: string, @Req() req: any) {
    const isFavorite = await this.favoritesService.isFavorite(req.user.id, menuItemId);
    return { isFavorite };
  }
}
