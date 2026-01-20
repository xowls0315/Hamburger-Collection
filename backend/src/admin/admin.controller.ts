import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard) // 관리자 기능은 인증 필요
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 맥도날드 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/mcdonalds/scrape')
  async scrapeMcDonaldsMenus() {
    return await this.adminService.scrapeMcDonaldsMenus();
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

  // KFC 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/kfc/scrape')
  async scrapeKfcMenus() {
    return await this.adminService.scrapeKfcMenus();
  }

  // 노브랜드 버거 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/nobrand/scrape')
  async scrapeNobrandMenus() {
    return await this.adminService.scrapeNobrandMenus();
  }

  // 프랭크 버거 메뉴 수집 (이미지 + 영양성분)
  @Post('menu-items/frank/scrape')
  async scrapeFrankMenus() {
    return await this.adminService.scrapeFrankMenus();
  }
}
