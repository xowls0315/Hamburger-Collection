import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestLog } from '../entities/ingest-log.entity';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';
import { Nutrition } from '../../nutrition/entities/nutrition.entity';
import { BrandsService } from '../../brands/brands.service';
import { BaseScraperService } from './base-scraper.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class NobrandScraperService extends BaseScraperService {
  constructor(
    @InjectRepository(IngestLog)
    ingestLogsRepository: Repository<IngestLog>,
    @InjectRepository(MenuItem)
    menuItemsRepository: Repository<MenuItem>,
    @InjectRepository(Nutrition)
    nutritionRepository: Repository<Nutrition>,
    private brandsService: BrandsService,
  ) {
    super(ingestLogsRepository, menuItemsRepository, nutritionRepository);
  }

  /**
   * 메뉴 이름 정규화 함수
   */
  private normalizeMenuName(name: string): string {
    return name.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private cleanMenuName(name: string): string {
    const $ = cheerio.load(name.replace(/<br\s*\/?>/gi, '\n'));
    const text = $.root().text();
    const firstLine = text
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .find(Boolean);

    return firstLine || text.replace(/\s+/g, ' ').trim();
  }

  private cleanDescription(description?: string): string | undefined {
    if (!description) {
      return undefined;
    }

    const $ = cheerio.load(description.replace(/<br\s*\/?>/gi, ' '));
    const text = $.root().text().replace(/\s+/g, ' ').trim();
    return text || undefined;
  }

  private toNobrandImageUrl(src?: string): string | undefined {
    if (!src) {
      return undefined;
    }

    if (src.startsWith('http')) {
      return src;
    }
    if (src.startsWith('//')) {
      return `https:${src}`;
    }
    if (src.startsWith('/')) {
      return `https://www.shinsegaefood.com${src}`;
    }

    return `https://www.shinsegaefood.com/uimages/${src}`;
  }

  private async fetchCurrentBurgerMenus(): Promise<
    Array<{
      name: string;
      imageUrl?: string;
      detailUrl: string;
      description?: string;
    }>
  > {
    const response = await axios.get<string>(
      'https://www.shinsegaefood.com/nobrandburger/index.sf',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 30000,
      },
    );
    const $ = cheerio.load(response.data);
    const results: Array<{
      name: string;
      imageUrl?: string;
      detailUrl: string;
      description?: string;
    }> = [];
    const seen = new Set<string>();

    ['#cate_218', '#cate_246'].forEach((selector) => {
      $(`${selector} li.menu_item`).each((_, item) => {
        const $item = $(item);
        const $button = $item.find('button.menu_anch').first();
        const rawName =
          $button.attr('data-name') || $item.find('em.menu_name').html() || '';
        const name = this.cleanMenuName(rawName);

        if (!name || seen.has(this.normalizeMenuName(name))) {
          return;
        }

        const imageUrl = this.toNobrandImageUrl(
          $item.find('div.menu_img img').first().attr('src') ||
            $button.attr('data-img'),
        );
        results.push({
          name,
          imageUrl,
          detailUrl: 'https://www.shinsegaefood.com/nobrandburger/index.sf#none',
          description: this.cleanDescription($button.attr('data-story')),
        });
        seen.add(this.normalizeMenuName(name));
      });
    });

    return results;
  }

  /**
   * 노브랜드버거 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
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
    const brand = await this.brandsService.findOneBySlug('nobrand');
    if (!brand) {
      throw new NotFoundException('노브랜드 버거 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 노브랜드 버거 메뉴 수집 시작...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    const menuDataMap = new Map<
      string,
      { imageUrl?: string; detailUrl?: string; description?: string }
    >();
    const nobrandMenus: string[] = [];

    try {
      console.log(`\n🌐 노브랜드버거 홈페이지 메뉴 수집 중...`);
      const currentMenus = await this.fetchCurrentBurgerMenus();

      for (const menu of currentMenus) {
        nobrandMenus.push(menu.name);
        menuDataMap.set(menu.name, {
          imageUrl: menu.imageUrl,
          detailUrl: menu.detailUrl,
          description: menu.description,
        });
        console.log(
          `  ✅ 발견: "${menu.name}"${menu.imageUrl ? ` - 이미지: ${menu.imageUrl.substring(0, 60)}...` : ''}${menu.description ? ` - description: ${menu.description.substring(0, 40)}...` : ''}`,
        );
      }

      console.log(`📋 총 ${nobrandMenus.length}개의 현재 메뉴를 처리합니다.`);
    } catch (error: any) {
      console.error(`  ❌ 스크래핑 실패: ${error.message}`);
      errors++;
      errorDetails.push(`스크래핑 실패: ${error.message}`);
    }

    console.log(`\n📊 총 ${menuDataMap.size}개의 메뉴 정보를 찾았습니다.`);

    // 영양성분 데이터 매핑 (이미지에서 제공된 데이터 기반)
    console.log(`\n📊 영양성분 데이터 매핑 중...`);
    const nutritionMap = new Map<string, any>();

    const nutritionDataMapping: Record<string, any> = {
      'NBB 어메이징 더블 치즈': {
        kcal: 512,
        protein: 27,
        sodium: 1224,
        sugar: 7,
        saturatedFat: 15,
      },
      'NBB 어메이징 더블 업': {
        kcal: 725,
        protein: 32,
        sodium: 1433,
        sugar: 9,
        saturatedFat: 15,
      },
      'NBB 어메이징 불고기': {
        kcal: 372,
        protein: 15,
        sodium: 423,
        sugar: 10,
        saturatedFat: 5,
      },
      'NBB 어메이징 더블 살사': {
        kcal: 481,
        protein: 23,
        sodium: 1086,
        sugar: 9,
        saturatedFat: 10,
      },
      시그니처: {
        kcal: 531,
        protein: 21,
        sodium: 1138,
        sugar: 9,
        saturatedFat: 9,
      },
      오리지널: {
        kcal: 439,
        protein: 17,
        sodium: 642,
        sugar: 8,
        saturatedFat: 6,
      },
      '미트 마니아': {
        kcal: 749,
        protein: 37,
        sodium: 1796,
        sugar: 9,
        saturatedFat: 13,
      },
      '그릴드 불고기': {
        kcal: 426,
        protein: 16,
        sodium: 699,
        sugar: 12,
        saturatedFat: 5,
      },
      갈릭앤갈릭: {
        kcal: 486,
        protein: 16,
        sodium: 733,
        sugar: 6,
        saturatedFat: 6,
      },
      메가바이트: {
        kcal: 657,
        protein: 19,
        sodium: 989,
        sugar: 7,
        saturatedFat: 7,
      },
      '더블치즈 베이컨 시그니처': {
        kcal: 551,
        protein: 25,
        sodium: 1485,
        sugar: 7,
        saturatedFat: 9,
      },
      '코울슬로 치킨': {
        kcal: 530,
        protein: 27,
        sodium: 1307,
        sugar: 9,
        saturatedFat: 6,
      },
      '크런치 치킨': {
        kcal: 530,
        protein: 27,
        sodium: 1307,
        sugar: 9,
        saturatedFat: 6,
      },
      '트리플 베이컨': {
        kcal: 644,
        protein: 33,
        sodium: 1673,
        sugar: 9,
        saturatedFat: 10,
      },
      '치폴레 치킨': {
        kcal: 388,
        protein: 18,
        sodium: 918,
        sugar: 9,
        saturatedFat: 7,
      },
      '치폴레 핫 치킨': {
        kcal: 491,
        protein: 19,
        sodium: 1630,
        sugar: 12,
        saturatedFat: 2,
      },
      '오리지널 새우': {
        kcal: 429,
        protein: 13,
        sodium: 926,
        sugar: 9,
        saturatedFat: 5,
      },
      '비스크 치즈 새우': {
        kcal: 425,
        protein: 15,
        sodium: 1145,
        sugar: 7,
        saturatedFat: 7,
      },
      '더블 그릴드 불고기': {
        kcal: 577,
        protein: 28,
        sodium: 990,
        sugar: 17,
        saturatedFat: 8,
      },
      '통마늘 베이컨': {
        kcal: 526,
        protein: 23,
        sodium: 915,
        sugar: 7,
        saturatedFat: 7,
      },
      'NBB 어메이징 더블': {
        kcal: 555,
        protein: 24,
        sodium: 1104,
        sugar: 8,
        saturatedFat: 12,
      },
      치즈: {
        kcal: 423,
        protein: 14,
        sodium: 816,
        sugar: 7,
        saturatedFat: 8,
      },
      '에그 치즈 불고기': {
        kcal: 527,
        protein: 21,
        sodium: 1083,
        sugar: 12,
        saturatedFat: 13,
      },
      '아보카도 타코': {
        kcal: 477,
        protein: 19,
        sodium: 980,
        sugar: 9,
        saturatedFat: 8,
      },
      '스모크 바비큐': {
        kcal: 455,
        protein: 20,
        sodium: 978,
        sugar: 17,
        saturatedFat: 6,
      },
      '버크셔K 카츠': {
        kcal: 462,
        protein: 17,
        sodium: 940,
        sugar: 7,
        saturatedFat: 9,
      },
      '버크셔K 카츠 어니언': {
        kcal: 524,
        protein: 16,
        sodium: 1003,
        sugar: 8,
        saturatedFat: 9,
      },
      '데일리 치킨': {
        kcal: 429,
        protein: 20,
        sodium: 957,
        sugar: 11,
        saturatedFat: 4,
      },
      '클럽 샌드위치 버거': {
        kcal: 480,
        protein: 25,
        sodium: 1949,
        sugar: 9,
        saturatedFat: 12,
      },
      'NBB 어메이징 감바스 새우': {
        kcal: 439,
        protein: 16,
        sodium: 1091,
        sugar: 9,
        saturatedFat: 5,
      },
      '골든 카츠': {
        kcal: 594,
        protein: 17,
        sodium: 954,
        sugar: 11,
        saturatedFat: 10,
      },
      '골든 모짜카츠': {
        kcal: 823,
        protein: 28,
        sodium: 1414,
        sugar: 16,
        saturatedFat: 15,
      },
      '고스트페퍼 살사 더블': {
        kcal: 836,
        protein: 32,
        sodium: 2320,
        sugar: 13,
        saturatedFat: 5,
      },
      '고스트페퍼 살사 치킨': {
        kcal: 472,
        protein: 25,
        sodium: 1479,
        sugar: 10,
        saturatedFat: 2,
      },
    };

    // 영양성분 데이터 매핑
    for (const [menuName, nutritionData] of Object.entries(
      nutritionDataMapping,
    )) {
      nutritionMap.set(menuName, nutritionData);
      nutritionMap.set(this.normalizeMenuName(menuName), nutritionData);
      console.log(
        `  ✅ 영양성분 매핑: ${menuName} -> 칼로리: ${nutritionData.kcal}kcal, 단백질: ${nutritionData.protein}g, 나트륨: ${nutritionData.sodium}mg`,
      );
    }

    console.log(
      `\n📊 총 ${nutritionMap.size}개의 메뉴에 대한 영양성분 데이터를 매핑했습니다.`,
    );

    // 데이터베이스에 저장
    console.log(`\n💾 데이터베이스에 저장 중...`);
    const activeMenuNames: string[] = [];

    for (const targetMenu of nobrandMenus) {
      try {
        const menuData = menuDataMap.get(targetMenu);
        const nutritionData =
          nutritionMap.get(targetMenu) ||
          nutritionMap.get(this.normalizeMenuName(targetMenu)) ||
          {};

        if (!menuData) {
          console.log(`  ⚠️ 메뉴 정보를 찾을 수 없음: ${targetMenu}`);
          errors++;
          errorDetails.push(`${targetMenu}: 메뉴 정보를 찾을 수 없음`);
          continue;
        }

        // 기존 메뉴 확인
        const existingMenuItem = await this.menuItemsRepository.findOne({
          where: {
            brandId: brand.id,
            name: targetMenu,
          },
        });

        if (existingMenuItem) {
          // 업데이트
          if (menuData.imageUrl) {
            existingMenuItem.imageUrl = menuData.imageUrl;
          }
          if (menuData.detailUrl) {
            existingMenuItem.detailUrl = menuData.detailUrl;
          }
          if (menuData.description) {
            existingMenuItem.description = menuData.description;
          }
          existingMenuItem.isActive = true;
          await this.menuItemsRepository.save(existingMenuItem);

          // 영양정보 업데이트
          if (Object.keys(nutritionData).length > 0) {
            let nutrition = await this.nutritionRepository.findOne({
              where: { menuItemId: existingMenuItem.id },
            });

            if (!nutrition) {
              nutrition = this.nutritionRepository.create({
                menuItemId: existingMenuItem.id,
              });
            }

            Object.assign(nutrition, nutritionData);
            await this.nutritionRepository.save(nutrition);
            console.log(
              `    📊 영양성분 저장: ${JSON.stringify(nutritionData)}`,
            );
          } else {
            console.log(
              `    ⚠️ 영양성분 데이터 없음: ${targetMenu} (nutritionMap에 없음)`,
            );
          }

          updated++;
          activeMenuNames.push(targetMenu);
          console.log(`  ✅ 업데이트 완료: ${targetMenu}`);
        } else {
          // 생성
          const menuItem = this.menuItemsRepository.create({
            brandId: brand.id,
            name: targetMenu,
            category: 'burger',
            imageUrl: menuData.imageUrl,
            detailUrl: menuData.detailUrl,
            description: menuData.description || undefined,
            isActive: true,
          });

          const savedMenuItem = await this.menuItemsRepository.save(menuItem);

          // 영양정보 추가
          if (Object.keys(nutritionData).length > 0) {
            const nutrition = this.nutritionRepository.create({
              menuItemId: savedMenuItem.id,
              ...nutritionData,
            });
            await this.nutritionRepository.save(nutrition);
            console.log(
              `    📊 영양성분 저장: ${JSON.stringify(nutritionData)}`,
            );
          } else {
            console.log(
              `    ⚠️ 영양성분 데이터 없음: ${targetMenu} (nutritionMap에 없음)`,
            );
          }

          created++;
          activeMenuNames.push(targetMenu);
          console.log(`  ✅ 생성 완료: ${targetMenu}`);
        }
      } catch (error: any) {
        errors++;
        const errorMsg = `${targetMenu}: ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ 에러: ${errorMsg}`);
      }
    }

    const deactivated = await this.deactivateStaleMenuItems(
      brand.id,
      activeMenuNames,
    );
    if (deactivated > 0) {
      console.log(`  🗄️ 현재 홈페이지에 없는 메뉴 ${deactivated}개 비활성화`);
    }

    // 수집 로그 저장
    await this.createIngestLog({
      brandId: brand.id,
      status: errors === 0 ? 'success' : 'partial',
      changedCount: created + updated + deactivated,
      error: errors > 0 ? JSON.stringify(errorDetails.slice(0, 10)) : undefined,
    });

    console.log(
      `\n📊 수집 완료: ${created}개 생성, ${updated}개 업데이트, ${errors}개 실패`,
    );

    return {
      success: true,
      brand: brand.name,
      total: nobrandMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
