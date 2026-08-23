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
export class FrankScraperService extends BaseScraperService {
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

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private toFrankImageUrl(src?: string): string | undefined {
    if (!src) {
      return undefined;
    }

    if (src.startsWith('http')) {
      return src;
    }

    return new URL(src, 'https://frankburger.co.kr/html/menu_1.html').href;
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
      'https://frankburger.co.kr/html/menu_1.html',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        proxy: false,
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

    $('.set_cont').each((_, item) => {
      const $item = $(item);
      const name = this.cleanText($item.find('.menu_ko').first().text());
      if (!name || seen.has(this.normalizeMenuName(name))) {
        return;
      }

      const style = $item.find('.img_area').first().attr('style') || '';
      const imageMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
      const description = this.cleanText($item.find('.stext').first().text());

      results.push({
        name,
        imageUrl: this.toFrankImageUrl(imageMatch?.[1]),
        detailUrl: 'https://frankburger.co.kr/html/menu_1.html',
        description: description || undefined,
      });
      seen.add(this.normalizeMenuName(name));
    });

    return results;
  }

  /**
   * 프랭크버거 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
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
    const brand = await this.brandsService.findOneBySlug('frank');
    if (!brand) {
      throw new NotFoundException('프랭크버거 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 프랭크버거 메뉴 수집 시작...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    const menuDataMap = new Map<
      string,
      { imageUrl?: string; detailUrl?: string; description?: string }
    >();
    const frankMenus: string[] = [];

    try {
      console.log(`\n🌐 프랭크버거 메뉴 페이지 수집 중...`);
      const currentMenus = await this.fetchCurrentBurgerMenus();

      for (const menu of currentMenus) {
        frankMenus.push(menu.name);
        menuDataMap.set(menu.name, {
          imageUrl: menu.imageUrl,
          detailUrl: menu.detailUrl,
          description: menu.description,
        });
        console.log(
          `  ✅ 발견: "${menu.name}"${menu.imageUrl ? ` - 이미지: ${menu.imageUrl.substring(0, 60)}...` : ''}${menu.description ? ` - description: ${menu.description.substring(0, 40)}...` : ''}`,
        );
      }

      console.log(`📋 총 ${frankMenus.length}개의 현재 메뉴를 처리합니다.`);
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
      '파닭파닭 치킨버거': {
        kcal: 649.14,
        protein: 27.97,
        sodium: 1067.37,
        sugar: 10.81,
        saturatedFat: 10.51,
      },
      '깐쇼새우 비프버거': {
        kcal: 772.26,
        protein: 27.88,
        sodium: 1252.34,
        sugar: 12.92,
        saturatedFat: 14.28,
      },
      '맥앤치즈 비프버거': {
        kcal: 910.38,
        protein: 35.9,
        sodium: 1759.22,
        sugar: 5.44,
        saturatedFat: 21.61,
      },
      '피넛 버터 더블 버거': {
        kcal: 759,
        protein: 33.2,
        sodium: 750.5,
        sugar: 19.8,
        saturatedFat: 17.5,
      },
      '피넛 버터 더블 치즈 버거': {
        kcal: 788,
        protein: 34.9,
        sodium: 984.6,
        sugar: 19.5,
        saturatedFat: 18.6,
      },
      '100% 한우 갈릭 버거': {
        kcal: 554,
        protein: 25.6,
        sodium: 1004.3,
        sugar: 11.8,
        saturatedFat: 12.3,
      },
      '100% 한우 버거': {
        kcal: 443,
        protein: 21.8,
        sodium: 638.0,
        sugar: 9.0,
        saturatedFat: 8.8,
      },
      '프랭크 버거': {
        kcal: 438,
        protein: 17.9,
        sodium: 603.8,
        sugar: 5.3,
        saturatedFat: 10.1,
      },
      'K 불고기 버거': {
        kcal: 492,
        protein: 20.0,
        sodium: 656.9,
        sugar: 10.6,
        saturatedFat: 10.3,
      },
      'K 핫불고기 버거': {
        kcal: 511,
        protein: 20.0,
        sodium: 688.3,
        sugar: 6.4,
        saturatedFat: 9.7,
      },
      '쉬림프 버거': {
        kcal: 568,
        protein: 13.5,
        sodium: 878.5,
        sugar: 8.6,
        saturatedFat: 8.5,
      },
      '청양마요 쉬림프 버거': {
        kcal: 578,
        protein: 14.7,
        sodium: 958.3,
        sugar: 10.6,
        saturatedFat: 7.4,
      },
      치즈버거: {
        kcal: 472,
        protein: 20.2,
        sodium: 750.2,
        sugar: 4.3,
        saturatedFat: 12.1,
      },
      '크리스피 카츠 버거': {
        kcal: 805,
        protein: 29.3,
        sodium: 1281.5,
        sugar: 8.8,
        saturatedFat: 19.4,
      },
      '크리스피 치킨 버거': {
        kcal: 626,
        protein: 26.1,
        sodium: 1120.5,
        sugar: 8.8,
        saturatedFat: 9.9,
      },
      '해쉬 비프 버거': {
        kcal: 658,
        protein: 21.1,
        sodium: 872.0,
        sugar: 14.0,
        saturatedFat: 11.2,
      },
      '베이컨 치즈버거': {
        kcal: 605,
        protein: 28.4,
        sodium: 983.8,
        sugar: 11.4,
        saturatedFat: 15.3,
      },
      '비프 앤 쉬림프 버거': {
        kcal: 730,
        protein: 27.5,
        sodium: 1143.8,
        sugar: 9.2,
        saturatedFat: 13.5,
      },
      '더블 비프 치즈 버거': {
        kcal: 713,
        protein: 28.7,
        sodium: 1115.6,
        sugar: 8.6,
        saturatedFat: 17.8,
      },
      '치즈 도넛 비프 버거': {
        kcal: 796,
        protein: 31.1,
        sodium: 1197.9,
        sugar: 10.0,
        saturatedFat: 16.8,
      },
      JG버거: {
        kcal: 726,
        protein: 36.7,
        sodium: 1415.4,
        sugar: 6.6,
        saturatedFat: 20.6,
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

    for (const targetMenu of frankMenus) {
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
      total: frankMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
