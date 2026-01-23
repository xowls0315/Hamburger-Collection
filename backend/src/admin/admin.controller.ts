import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard) // 관리자 기능은 인증 필요
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('menu-items/mcdonalds/scrape')
  @ApiOperation({
    summary: '맥도날드 메뉴 수집',
    description: '맥도날드 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeMcDonaldsMenus() {
    return await this.adminService.scrapeMcDonaldsMenus();
  }

  @Post('menu-items/burgerking/scrape')
  @ApiOperation({
    summary: '버거킹 메뉴 수집',
    description: '버거킹 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeBurgerKingMenus() {
    return await this.adminService.scrapeBurgerKingMenus();
  }

  @Post('menu-items/lotteria/scrape')
  @ApiOperation({
    summary: '롯데리아 메뉴 수집',
    description: '롯데리아 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeLotteriaMenus() {
    return await this.adminService.scrapeLotteriaMenus();
  }

  @Post('menu-items/momstouch/scrape')
  @ApiOperation({
    summary: '맘스터치 메뉴 수집',
    description: '맘스터치 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeMomstouchMenus() {
    return await this.adminService.scrapeMomstouchMenus();
  }

  @Post('menu-items/kfc/scrape')
  @ApiOperation({
    summary: 'KFC 메뉴 수집',
    description: 'KFC 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeKfcMenus() {
    return await this.adminService.scrapeKfcMenus();
  }

  @Post('menu-items/nobrand/scrape')
  @ApiOperation({
    summary: '노브랜드버거 메뉴 수집',
    description: '노브랜드버거 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeNobrandMenus() {
    return await this.adminService.scrapeNobrandMenus();
  }

  @Post('menu-items/frank/scrape')
  @ApiOperation({
    summary: '프랭크버거 메뉴 수집',
    description: '프랭크버거 메뉴를 스크래핑하여 데이터베이스에 저장합니다. (이미지 + 영양성분)',
  })
  @ApiResponse({ status: 201, description: '메뉴 수집 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async scrapeFrankMenus() {
    return await this.adminService.scrapeFrankMenus();
  }
}
