import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateMenuItemDto,
  BulkCreateMenuItemDto,
} from './dto/create-menu-item.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard) // 관리자 기능은 인증 필요
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 일괄 메뉴 아이템 추가 (더 구체적인 라우트를 먼저 정의)
  @Post('menu-items/bulk')
  async bulkCreateMenuItems(@Body() bulkCreateDto: BulkCreateMenuItemDto) {
    return await this.adminService.bulkCreateMenuItems(bulkCreateDto);
  }

  // 단일 메뉴 아이템 추가
  @Post('menu-items/:brandSlug')
  async createMenuItem(
    @Param('brandSlug') brandSlug: string,
    @Body() createMenuItemDto: CreateMenuItemDto,
  ) {
    return await this.adminService.createMenuItem(brandSlug, createMenuItemDto);
  }

  // FatSecret에서 탄수화물/지방 정보 업데이트
  @Post('nutrition/update-from-fatsecret/:brandSlug')
  async updateNutritionFromFatSecret(@Param('brandSlug') brandSlug: string) {
    return await this.adminService.updateNutritionFromFatSecret(brandSlug);
  }
}
