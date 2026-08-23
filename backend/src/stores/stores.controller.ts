import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StoresService } from './stores.service';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('search')
  @ApiOperation({
    summary: '주변 매장 검색',
    description:
      '카카오 로컬 API를 사용하여 현재 위치 기반으로 주변 브랜드 매장을 검색합니다.',
  })
  @ApiQuery({
    name: 'brandSlug',
    description: '브랜드 slug (예: mcdonalds, burgerking)',
    example: 'mcdonalds',
  })
  @ApiQuery({
    name: 'lat',
    description: '위도 (latitude)',
    example: '37.5665',
  })
  @ApiQuery({
    name: 'lng',
    description: '경도 (longitude)',
    example: '126.9780',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: '검색 반경 (미터, 기본값: 5000)',
    example: '5000',
  })
  @ApiResponse({
    status: 200,
    description: '매장 검색 성공',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 파라미터' })
  @ApiResponse({ status: 500, description: '카카오 API 오류' })
  search(
    @Query('brandSlug') brandSlug: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const parsedLat = this.parseBoundedFloat(lat, -90, 90, 'lat');
    const parsedLng = this.parseBoundedFloat(lng, -180, 180, 'lng');
    const parsedRadius = this.parseBoundedInt(radius, 5000, 1, 20000, 'radius');
    return this.storesService.searchStores(
      brandSlug,
      parsedLat,
      parsedLng,
      parsedRadius,
    );
  }

  private parseBoundedFloat(
    value: string | undefined,
    min: number,
    max: number,
    name: string,
  ) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(
        `${name} must be a number between ${min} and ${max}`,
      );
    }
    return parsed;
  }

  private parseBoundedInt(
    value: string | undefined,
    defaultValue: number,
    min: number,
    max: number,
    name: string,
  ) {
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(
        `${name} must be an integer between ${min} and ${max}`,
      );
    }
    return parsed;
  }
}
