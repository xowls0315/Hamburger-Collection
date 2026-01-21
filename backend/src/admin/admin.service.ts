import { Injectable, NotFoundException } from '@nestjs/common';
import { BrandsService } from '../brands/brands.service';
import { McDonaldsScraperService } from './scrapers/mcdonalds-scraper.service';
import { BurgerKingScraperService } from './scrapers/burgerking-scraper.service';
import { LotteriaScraperService } from './scrapers/lotteria-scraper.service';
import { MomstouchScraperService } from './scrapers/momstouch-scraper.service';
import { NobrandScraperService } from './scrapers/nobrand-scraper.service';
import { FrankScraperService } from './scrapers/frank-scraper.service';

@Injectable()
export class AdminService {
  constructor(
    private brandsService: BrandsService,
    private mcdonaldsScraper: McDonaldsScraperService,
    private burgerKingScraper: BurgerKingScraperService,
    private lotteriaScraper: LotteriaScraperService,
    private momstouchScraper: MomstouchScraperService,
    private nobrandScraper: NobrandScraperService,
    private frankScraper: FrankScraperService,
  ) {}

  /**
   * 맥도날드 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeMcDonaldsMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    return await this.mcdonaldsScraper.scrapeMcDonaldsMenus();
  }

  /**
   * 맥도날드 메뉴 페이지에서 이미지 URL을 추출하여 업데이트 (레거시 - 사용 안 함)
   * @deprecated Use scrapeMcDonaldsMenus instead
   */
  async updateImageUrlsFromMcDonalds(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    // 레거시 메서드 - scrapeMcDonaldsMenus로 대체됨
    const result = await this.scrapeMcDonaldsMenus();
    return {
      success: result.success,
      brand: result.brand,
      total: result.total,
      updated: result.updated,
      errors: result.errors,
      errorDetails: result.errorDetails,
    };
  }

  /**
   * 버거킹 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   * 버거킹 사이트는 JavaScript로 동적 렌더링되므로, 메뉴 이름 리스트를 기반으로 처리
   */
  async scrapeBurgerKingMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    return await this.burgerKingScraper.scrapeBurgerKingMenus();
  }

  /**
   * 롯데리아 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeLotteriaMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    return await this.lotteriaScraper.scrapeLotteriaMenus();
  }

  /**
   * 맘스터치 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeMomstouchMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    return await this.momstouchScraper.scrapeMomstouchMenus();
  }

  /**
   * KFC 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeKfcMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug('kfc');
    if (!brand) {
      throw new NotFoundException('KFC 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 KFC 메뉴 수집 시작...`);

    // TODO: KFC 메뉴 스크래핑 로직 구현
    return {
      success: false,
      brand: brand.name,
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: ['KFC 스크래핑 로직이 아직 구현되지 않았습니다.'],
    };
  }

  /**
   * 노브랜드 버거 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeNobrandMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    return await this.nobrandScraper.scrapeNobrandMenus();
  }

  /**
   * 프랭크 버거 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeFrankMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    return await this.frankScraper.scrapeFrankMenus();
  }
}
