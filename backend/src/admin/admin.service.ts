import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestLog } from './entities/ingest-log.entity';
import { BrandsService } from '../brands/brands.service';
import { MenuItem } from '../menu-items/entities/menu-item.entity';
import { Nutrition } from '../nutrition/entities/nutrition.entity';
import {
  CreateMenuItemDto,
  BulkCreateMenuItemDto,
} from './dto/create-menu-item.dto';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(IngestLog)
    private ingestLogsRepository: Repository<IngestLog>,
    @InjectRepository(MenuItem)
    private menuItemsRepository: Repository<MenuItem>,
    @InjectRepository(Nutrition)
    private nutritionRepository: Repository<Nutrition>,
    private brandsService: BrandsService,
  ) {}

  async createIngestLog(logData: {
    brandId: string;
    status: string;
    changedCount?: number;
    error?: string;
  }): Promise<IngestLog> {
    const log = this.ingestLogsRepository.create(logData);
    return await this.ingestLogsRepository.save(log);
  }

  /**
   * 단일 메뉴 아이템 추가
   */
  async createMenuItem(
    brandSlug: string,
    createMenuItemDto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    const brand = await this.brandsService.findOneBySlug(brandSlug);
    if (!brand) {
      throw new NotFoundException(`브랜드 '${brandSlug}'를 찾을 수 없습니다.`);
    }

    // 기존 메뉴 확인 (같은 브랜드, 같은 이름)
    const existingMenuItem = await this.menuItemsRepository.findOne({
      where: {
        brandId: brand.id,
        name: createMenuItemDto.name,
      },
    });

    if (existingMenuItem) {
      // 기존 메뉴 업데이트
      existingMenuItem.category = createMenuItemDto.category;
      if (createMenuItemDto.imageUrl !== undefined) {
        existingMenuItem.imageUrl = createMenuItemDto.imageUrl;
      }
      if (createMenuItemDto.detailUrl !== undefined) {
        existingMenuItem.detailUrl = createMenuItemDto.detailUrl;
      }
      if (createMenuItemDto.isActive !== undefined) {
        existingMenuItem.isActive = createMenuItemDto.isActive;
      }

      // 영양정보 업데이트
      if (createMenuItemDto.nutrition) {
        let nutrition = await this.nutritionRepository.findOne({
          where: { menuItemId: existingMenuItem.id },
        });

        if (!nutrition) {
          nutrition = this.nutritionRepository.create({
            menuItemId: existingMenuItem.id,
          });
        }

        Object.assign(nutrition, createMenuItemDto.nutrition);
        await this.nutritionRepository.save(nutrition);
      }

      return await this.menuItemsRepository.save(existingMenuItem);
    } else {
      // 새 메뉴 생성
      const menuItem = this.menuItemsRepository.create({
        brandId: brand.id,
        name: createMenuItemDto.name,
        category: createMenuItemDto.category,
        imageUrl: createMenuItemDto.imageUrl,
        detailUrl: createMenuItemDto.detailUrl,
        isActive: createMenuItemDto.isActive ?? true,
      });

      const savedMenuItem = await this.menuItemsRepository.save(menuItem);

      // 영양정보 추가
      if (createMenuItemDto.nutrition) {
        const nutrition = this.nutritionRepository.create({
          menuItemId: savedMenuItem.id,
          ...createMenuItemDto.nutrition,
        });
        await this.nutritionRepository.save(nutrition);
      }

      return savedMenuItem;
    }
  }

  /**
   * 일괄 메뉴 아이템 추가
   */
  async bulkCreateMenuItems(bulkCreateDto: BulkCreateMenuItemDto): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug(
      bulkCreateDto.brandSlug,
    );
    if (!brand) {
      throw new NotFoundException(
        `브랜드 '${bulkCreateDto.brandSlug}'를 찾을 수 없습니다.`,
      );
    }

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const menuItemDto of bulkCreateDto.menuItems) {
      try {
        const existingMenuItem = await this.menuItemsRepository.findOne({
          where: {
            brandId: brand.id,
            name: menuItemDto.name,
          },
        });

        if (existingMenuItem) {
          // 업데이트
          existingMenuItem.category = menuItemDto.category;
          if (menuItemDto.imageUrl !== undefined) {
            existingMenuItem.imageUrl = menuItemDto.imageUrl;
          }
          if (menuItemDto.detailUrl !== undefined) {
            existingMenuItem.detailUrl = menuItemDto.detailUrl;
          }
          if (menuItemDto.isActive !== undefined) {
            existingMenuItem.isActive = menuItemDto.isActive;
          }
          await this.menuItemsRepository.save(existingMenuItem);

          // 영양정보 업데이트
          if (menuItemDto.nutrition) {
            let nutrition = await this.nutritionRepository.findOne({
              where: { menuItemId: existingMenuItem.id },
            });

            if (!nutrition) {
              nutrition = this.nutritionRepository.create({
                menuItemId: existingMenuItem.id,
              });
            }

            Object.assign(nutrition, menuItemDto.nutrition);
            await this.nutritionRepository.save(nutrition);
          }

          updated++;
        } else {
          // 생성
          const menuItem = this.menuItemsRepository.create({
            brandId: brand.id,
            name: menuItemDto.name,
            category: menuItemDto.category,
            imageUrl: menuItemDto.imageUrl,
            detailUrl: menuItemDto.detailUrl,
            isActive: menuItemDto.isActive ?? true,
          });

          const savedMenuItem = await this.menuItemsRepository.save(menuItem);

          // 영양정보 추가
          if (menuItemDto.nutrition) {
            const nutrition = this.nutritionRepository.create({
              menuItemId: savedMenuItem.id,
              ...menuItemDto.nutrition,
            });
            await this.nutritionRepository.save(nutrition);
          }

          created++;
        }
      } catch (error: any) {
        errors++;
        errorDetails.push(
          `${menuItemDto.name}: ${error.message || '알 수 없는 오류'}`,
        );
      }
    }

    // 수집 로그 저장
    await this.createIngestLog({
      brandId: brand.id,
      status: errors === 0 ? 'success' : 'partial',
      changedCount: created + updated,
      error: errors > 0 ? JSON.stringify(errorDetails.slice(0, 10)) : undefined,
    });

    return {
      success: true,
      brand: brand.name,
      total: bulkCreateDto.menuItems.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }

  /**
   * FatSecret에서 탄수화물과 지방 정보만 가져와서 업데이트
   */
  async updateNutritionFromFatSecret(brandSlug: string): Promise<{
    success: boolean;
    brand: string;
    total: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug(brandSlug);
    if (!brand) {
      throw new NotFoundException(`브랜드 '${brandSlug}'를 찾을 수 없습니다.`);
    }

    // 해당 브랜드의 모든 버거 메뉴 가져오기
    const menuItems = await this.menuItemsRepository.find({
      where: {
        brandId: brand.id,
        category: 'burger',
        isActive: true,
      },
      relations: ['nutrition'],
    });

    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    console.log(
      `\n🔍 ${brand.name} 버거 메뉴 ${menuItems.length}개에 대한 탄수화물/지방 정보 업데이트 시작...`,
    );

    for (const menuItem of menuItems) {
      try {
        await this.delay(500); // 서버 부하 방지

        console.log(
          `\n[${updated + errors + 1}/${menuItems.length}] 처리 중: ${menuItem.name}`,
        );

        // FatSecret 검색 URL
        const searchQuery = `맥도날드 ${menuItem.name}`;
        const searchUrl = `https://www.fatsecret.kr/%EC%B9%BC%EB%A1%9C%EB%A6%AC-%EC%98%81%EC%96%91%EC%86%8C/search?q=${encodeURIComponent(searchQuery)}`;

        // 검색 결과 페이지 가져오기
        const searchResponse = await axios.get(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        const $search = cheerio.load(searchResponse.data);

        // 검색 결과에서 첫 번째 메뉴 링크 찾기
        let menuDetailUrl: string | null = null;

        // 방법 1: a.prominent 클래스를 가진 링크 찾기
        $search('a.prominent').each((i, elem) => {
          if (menuDetailUrl) return false; // 이미 찾았으면 중단

          const href = $search(elem).attr('href');
          const text = $search(elem).text().trim();

          if (
            href &&
            (href.includes('/칼로리-영양소/') ||
              href.includes(
                '%EC%B9%BC%EB%A1%9C%EB%A6%AC-%EC%98%81%EC%96%91%EC%86%8C',
              )) &&
            text &&
            !text.startsWith('(') &&
            text !== '영양 정보'
          ) {
            // 메뉴 이름이 일치하는지 확인 (부분 일치)
            if (
              text.includes(menuItem.name) ||
              menuItem.name.includes(text) ||
              text
                .replace(/\s+/g, '')
                .includes(menuItem.name.replace(/\s+/g, ''))
            ) {
              menuDetailUrl = href.startsWith('http')
                ? href
                : `https://www.fatsecret.kr${href}`;
              return false; // break
            }
          }
        });

        if (!menuDetailUrl) {
          console.log(`  ⚠️ 검색 결과에서 메뉴 링크를 찾을 수 없습니다.`);
          errors++;
          errorDetails.push(
            `${menuItem.name}: 검색 결과에서 링크를 찾을 수 없음`,
          );
          continue;
        }

        console.log(`  🔗 메뉴 상세 페이지: ${menuDetailUrl}`);

        // 메뉴 상세 페이지에서 탄수화물과 지방 정보 추출
        const nutritionData =
          await this.scrapeCarbohydrateAndFatFromFatSecret(menuDetailUrl);

        if (!nutritionData) {
          console.log(`  ⚠️ 영양정보를 추출할 수 없습니다.`);
          errors++;
          errorDetails.push(`${menuItem.name}: 영양정보 추출 실패`);
          continue;
        }

        // 기존 영양정보 가져오기 또는 생성
        let nutrition = menuItem.nutrition;
        if (!nutrition) {
          nutrition = this.nutritionRepository.create({
            menuItemId: menuItem.id,
          });
        }

        // 탄수화물과 지방만 업데이트 (다른 정보는 유지)
        if (nutritionData.carbohydrate !== null) {
          nutrition.carbohydrate = nutritionData.carbohydrate;
        }
        if (nutritionData.fat !== null) {
          nutrition.fat = nutritionData.fat;
        }

        await this.nutritionRepository.save(nutrition);

        console.log(
          `  ✅ 업데이트 완료: 탄수화물=${nutritionData.carbohydrate ?? 'N/A'}g, 지방=${nutritionData.fat ?? 'N/A'}g`,
        );
        updated++;
      } catch (error: any) {
        errors++;
        const errorMsg = `${menuItem.name}: ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ 에러: ${errorMsg}`);
      }
    }

    // 수집 로그 저장
    await this.createIngestLog({
      brandId: brand.id,
      status: errors === 0 ? 'success' : 'partial',
      changedCount: updated,
      error: errors > 0 ? JSON.stringify(errorDetails.slice(0, 10)) : undefined,
    });

    console.log(`\n📊 업데이트 완료: ${updated}개 성공, ${errors}개 실패`);

    return {
      success: true,
      brand: brand.name,
      total: menuItems.length,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }

  /**
   * FatSecret 메뉴 상세 페이지에서 탄수화물과 지방만 추출
   */
  private async scrapeCarbohydrateAndFatFromFatSecret(url: string): Promise<{
    carbohydrate: number | null;
    fat: number | null;
  } | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      const $ = cheerio.load(response.data);

      const result: {
        carbohydrate: number | null;
        fat: number | null;
      } = {
        carbohydrate: null,
        fat: null,
      };

      // 값 파싱 헬퍼 함수
      const parseNutritionValue = (text: string): number | null => {
        if (!text) return null;
        let cleaned = text.replace(/[^\d.]/g, '').trim();
        if (!cleaned) return null;
        const parsed = parseFloat(cleaned);
        if (isNaN(parsed) || !isFinite(parsed)) return null;
        if (parsed < 0 || parsed > 10000) return null;
        return parsed;
      };

      // nutrition_facts div 구조에서 추출
      const nutritionFacts = $('.nutrition_facts');
      if (nutritionFacts.length > 0) {
        const nutrients = nutritionFacts.find('.nutrient');

        nutrients.each((i, elem) => {
          const $elem = $(elem);
          const text = $elem.text().trim();

          // 라벨인 경우 (left 클래스가 있고 sub가 아닌 경우)
          if ($elem.hasClass('left') && !$elem.hasClass('sub')) {
            const labelLower = text.toLowerCase();

            // 탄수화물
            if (
              labelLower.includes('탄수화물') ||
              labelLower.includes('carbohydrate') ||
              labelLower.includes('carb')
            ) {
              const $nextValue = $elem.next('.nutrient.right');
              if ($nextValue.length > 0) {
                const valueText = $nextValue.text().trim();
                const value = parseNutritionValue(valueText);
                if (value !== null && result.carbohydrate === null) {
                  result.carbohydrate = value;
                }
              }
            }
            // 지방 (포화지방 제외)
            else if (
              labelLower.includes('지방') &&
              !labelLower.includes('포화')
            ) {
              const $nextValue = $elem.next('.nutrient.right');
              if ($nextValue.length > 0) {
                const valueText = $nextValue.text().trim();
                const value = parseNutritionValue(valueText);
                if (value !== null && result.fat === null) {
                  result.fat = value;
                }
              }
            }
          }
        });
      }

      // 방법 2: 테이블 구조 (구버전 호환)
      if (result.carbohydrate === null || result.fat === null) {
        $('table tr').each((i, elem) => {
          const cells = $(elem).find('td, th');
          if (cells.length < 2) return;

          const label = $(cells[0]).text().toLowerCase().trim();
          const valueText = $(cells[1]).text().trim();

          if (result.carbohydrate === null) {
            if (
              label.includes('탄수화물') ||
              label.includes('carb') ||
              label.includes('carbohydrate')
            ) {
              const value = parseNutritionValue(valueText);
              if (value !== null) result.carbohydrate = value;
            }
          }

          if (result.fat === null) {
            if (
              label.includes('지방') &&
              !label.includes('포화') &&
              label.includes('fat') &&
              !label.includes('saturated')
            ) {
              const value = parseNutritionValue(valueText);
              if (value !== null) result.fat = value;
            }
          }
        });
      }

      // 둘 다 null이면 실패
      if (result.carbohydrate === null && result.fat === null) {
        return null;
      }

      return result;
    } catch (error: any) {
      console.error(`  ❌ 스크래핑 실패 (${url}):`, error.message);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
