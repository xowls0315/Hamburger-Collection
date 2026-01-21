import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BrandsService } from './brands.service';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({
    summary: '모든 브랜드 조회',
    description: '등록된 모든 햄버거 브랜드 목록을 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '브랜드 목록 조회 성공',
  })
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':slug')
  @ApiOperation({
    summary: '특정 브랜드 조회',
    description: 'slug로 특정 브랜드 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'slug',
    description: '브랜드 slug (예: mcdonalds, burgerking, lotteria)',
    example: 'mcdonalds',
  })
  @ApiResponse({ status: 200, description: '브랜드 조회 성공' })
  @ApiResponse({ status: 404, description: '브랜드를 찾을 수 없음' })
  findOne(@Param('slug') slug: string) {
    return this.brandsService.findOneBySlug(slug);
  }
}
