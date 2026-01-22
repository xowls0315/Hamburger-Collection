import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MenuItemsService } from './menu-items.service';

@ApiTags('menu-items')
@Controller('brands/:slug/menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get()
  @ApiOperation({
    summary: '브랜드별 메뉴 목록 조회',
    description: '특정 브랜드의 메뉴 목록을 페이지네이션과 함께 반환합니다.',
  })
  @ApiParam({
    name: 'slug',
    description: '브랜드 slug',
    example: 'mcdonalds',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: '카테고리 필터 (burger, chicken, side, drink)',
    example: 'burger',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 방식 (kcal_asc, kcal_desc)',
    example: 'kcal_asc',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '페이지 번호 (기본값: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '페이지당 항목 수 (기본값: 12)',
    example: 12,
  })
  @ApiResponse({ status: 200, description: '메뉴 목록 조회 성공' })
  findAll(
    @Param('slug') slug: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.menuItemsService.findAllByBrandSlug(slug, {
      category,
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 12,
    });
  }
}

@ApiTags('menu-items')
@Controller('menu-items')
export class MenuItemsDetailController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Get(':id')
  @ApiOperation({
    summary: '메뉴 상세 조회',
    description: '메뉴 ID로 상세 정보(영양성분 포함)를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '메뉴 ID (UUID)',
  })
  @ApiResponse({ status: 200, description: '메뉴 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '메뉴를 찾을 수 없음' })
  findOne(@Param('id') id: string) {
    return this.menuItemsService.findOne(id);
  }
}
