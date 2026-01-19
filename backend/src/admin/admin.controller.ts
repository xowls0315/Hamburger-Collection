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

  // 맥도날드 메뉴 이미지 URL 업데이트
  @Post('menu-items/mcdonalds/update-images')
  async updateImageUrlsFromMcDonalds() {
    return await this.adminService.updateImageUrlsFromMcDonalds();
  }

  // 버거킹 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/burgerking/scrape')
  async scrapeBurgerKingMenus() {
    return await this.adminService.scrapeBurgerKingMenus();
  }

  // 롯데리아 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/lotteria/scrape')
  async scrapeLotteriaMenus() {
    return await this.adminService.scrapeLotteriaMenus();
  }

  // 맘스터치 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/momstouch/scrape')
  async scrapeMomstouchMenus() {
    return await this.adminService.scrapeMomstouchMenus();
  }
}
