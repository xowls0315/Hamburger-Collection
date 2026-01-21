import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestLog } from '../entities/ingest-log.entity';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';
import { Nutrition } from '../../nutrition/entities/nutrition.entity';
import { BrandsService } from '../../brands/brands.service';
import { BaseScraperService } from './base-scraper.service';
import * as puppeteer from 'puppeteer';

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

    // 프랭크버거 메뉴 목록 (사용자가 제공한 18개)
    const frankMenus = [
      '피넛 버터 더블 버거',
      '피넛 버터 더블 치즈 버거',
      '100% 한우 갈릭 버거',
      '100% 한우 버거',
      '프랭크 버거',
      'K 불고기 버거',
      'K 핫불고기 버거',
      '쉬림프 버거',
      '청양마요 쉬림프 버거',
      '치즈버거',
      '크리스피 카츠 버거',
      '크리스피 치킨 버거',
      '해쉬 비프 버거',
      '베이컨 치즈버거',
      '비프 앤 쉬림프 버거',
      '더블 비프 치즈 버거',
      '치즈 도넛 비프 버거',
      'JG버거',
    ];

    console.log(`📋 총 ${frankMenus.length}개의 메뉴를 처리합니다.`);

    // Puppeteer로 메인 페이지에서 메뉴 정보 추출
    const menuDataMap = new Map<
      string,
      { imageUrl?: string; detailUrl?: string; description?: string }
    >();

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        // 프랭크버거 메뉴 페이지로 이동
        console.log(`\n🌐 프랭크버거 메뉴 페이지 접속 중...`);
        await page.goto('https://frankburger.co.kr/html/menu_1.html', {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // 페이지 로드 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 메뉴 목록에서 각 메뉴 정보 추출 (single-wrapper 안의 swiper-slide)
        console.log(`\n🔍 메뉴 목록에서 정보 추출 중...`);
        const menuItems = await page.evaluate((targetMenus) => {
          const results: Array<{
            name: string;
            imageUrl?: string;
            description?: string;
          }> = [];

          const normalizeName = (name: string): string => {
            return name.replace(/\s+/g, ' ').trim().toLowerCase();
          };

          // single-wrapper 안의 swiper-slide 요소들 찾기
          const singleWrapper = document.querySelector('.single-wrapper');
          if (!singleWrapper) return results;

          const slides = singleWrapper.querySelectorAll('.swiper-slide');
          slides.forEach((slide) => {
            const menuKoEl = slide.querySelector('p.menu_ko');
            const menuName = menuKoEl?.textContent?.trim() || '';

            if (!menuName) return;

            const normalizedMenuName = normalizeName(menuName);

            // 타겟 메뉴 목록과 매칭
            let matched = false;
            for (const target of targetMenus) {
              const normalizedTarget = normalizeName(target);

              // 정확히 일치하거나, 원본 이름이 타겟을 포함하거나, 타겟이 원본 이름을 포함하는 경우
              if (
                normalizedMenuName === normalizedTarget ||
                (normalizedMenuName.includes(normalizedTarget) &&
                  normalizedTarget.length >= 5) ||
                (normalizedTarget.includes(normalizedMenuName) &&
                  normalizedMenuName.length >= 5)
              ) {
                matched = true;
                break;
              }
            }

            if (matched) {
              // 이미지 URL 추출 (background-image에서)
              const imgArea = slide.querySelector('.img_area');
              let imageUrl = '';
              if (imgArea) {
                const style = window.getComputedStyle(imgArea);
                const bgImage = style.backgroundImage;
                if (bgImage && bgImage !== 'none') {
                  // url("...") 또는 url('...') 형식에서 URL 추출
                  const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                  if (match && match[1]) {
                    let url = match[1];
                    // 이미 전체 URL인 경우 그대로 사용
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                      imageUrl = url;
                    } else {
                      // 상대 경로 처리
                      if (url.startsWith('../')) {
                        url = url.replace('../', '/');
                      } else if (!url.startsWith('/')) {
                        url = `/${url}`;
                      }
                      imageUrl = `https://frankburger.co.kr${url}`;
                    }
                  }
                }
              }

              // description 추출 (p.stext 요소에서)
              let description = '';
              const stextEl = slide.querySelector('p.stext');
              if (stextEl) {
                // <br> 태그를 공백으로 변환하고 텍스트 추출
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = stextEl.innerHTML;
                // <br> 태그를 공백으로 변환
                const brElements = tempDiv.querySelectorAll('br');
                brElements.forEach((br) => {
                  br.replaceWith(' ');
                });
                description = tempDiv.textContent || tempDiv.innerText || '';
                // 여러 공백을 하나로 정리
                description = description.replace(/\s+/g, ' ').trim();
              }

              results.push({
                name: menuName,
                imageUrl: imageUrl || undefined,
                description: description || undefined,
              });
            }
          });

          return results;
        }, frankMenus);

        console.log(`  ✅ ${menuItems.length}개의 메뉴 정보 발견`);

        // 메뉴 데이터 맵에 저장 (각 타겟 메뉴에 대해 가장 정확한 스크랩된 메뉴를 찾음)
        for (const targetMenu of frankMenus) {
          let bestMatch: {
            name: string;
            imageUrl?: string;
            description?: string;
          } | null = null;
          let bestScore = 0;
          const normalizedTarget = this.normalizeMenuName(targetMenu);

          for (const menuItem of menuItems) {
            const normalizedMenuName = this.normalizeMenuName(menuItem.name);
            let score = 0;

            // 1. 정확히 일치 (최고 점수) - 즉시 매칭
            if (normalizedMenuName === normalizedTarget) {
              bestMatch = menuItem;
              bestScore = 100;
              break;
            }

            // 2. 원본 이름이 타겟을 완전히 포함하는 경우 (타겟이 최소 5글자 이상)
            if (
              normalizedMenuName.includes(normalizedTarget) &&
              normalizedTarget.length >= 5
            ) {
              score =
                (normalizedTarget.length / normalizedMenuName.length) * 95;
            }
            // 3. 타겟이 원본 이름을 완전히 포함하는 경우 (원본이 최소 5글자 이상)
            else if (
              normalizedTarget.includes(normalizedMenuName) &&
              normalizedMenuName.length >= 5
            ) {
              score =
                (normalizedMenuName.length / normalizedTarget.length) * 95;
            }

            // 4. 키워드 매칭 (공통 단어가 많을수록 높은 점수)
            const targetWords = normalizedTarget.split(/\s+/).filter((w) => w.length > 1);
            const menuWords = normalizedMenuName.split(/\s+/).filter((w) => w.length > 1);
            const commonWords = targetWords.filter((w) => menuWords.includes(w));
            if (commonWords.length > 0) {
              const keywordScore =
                (commonWords.length /
                  Math.max(targetWords.length, menuWords.length)) *
                85;
              if (keywordScore > score) {
                score = keywordScore;
              }
            }

            // 최고 점수 업데이트 (75점 이상만 허용)
            // 더 높은 점수이거나, 같은 점수면 원본 이름이 더 긴 것을 우선 (더 정확한 매칭)
            if (score >= 75) {
              if (
                score > bestScore ||
                (score === bestScore &&
                  menuItem.name.length >
                    (bestMatch?.name.length || 0))
              ) {
                bestMatch = menuItem;
                bestScore = score;
              }
            }
          }

          if (bestMatch && bestScore >= 75) {
            menuDataMap.set(targetMenu, {
              imageUrl: bestMatch.imageUrl,
              detailUrl: `https://frankburger.co.kr/html/menu_1.html`,
              description: bestMatch.description,
            });

            console.log(
              `  ✅ 발견: "${targetMenu}" (원본 이름: "${bestMatch.name}", 점수: ${bestScore.toFixed(1)})${bestMatch.imageUrl ? ` - 이미지: ${bestMatch.imageUrl.substring(0, 60)}...` : ''}${bestMatch.description ? ` - description: ${bestMatch.description.substring(0, 40)}...` : ''}`,
            );
          } else {
            console.log(
              `  ⚠️ 매칭 실패: "${targetMenu}" (최고 점수: ${bestScore.toFixed(1)})`,
            );
          }
        }
      } finally {
        await browser.close();
      }
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
      '치즈버거': {
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
      'JG버거': {
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
      console.log(
        `  ✅ 영양성분 매핑: ${menuName} -> 칼로리: ${nutritionData.kcal}kcal, 단백질: ${nutritionData.protein}g, 나트륨: ${nutritionData.sodium}mg`,
      );
    }

    console.log(
      `\n📊 총 ${nutritionMap.size}개의 메뉴에 대한 영양성분 데이터를 매핑했습니다.`,
    );

    // 데이터베이스에 저장
    console.log(`\n💾 데이터베이스에 저장 중...`);

    for (const targetMenu of frankMenus) {
      try {
        const menuData = menuDataMap.get(targetMenu);
        const nutritionData = nutritionMap.get(targetMenu) || {};

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
          console.log(`  ✅ 생성 완료: ${targetMenu}`);
        }
      } catch (error: any) {
        errors++;
        const errorMsg = `${targetMenu}: ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ 에러: ${errorMsg}`);
      }
    }

    // 수집 로그 저장
    await this.createIngestLog({
      brandId: brand.id,
      status: errors === 0 ? 'success' : 'partial',
      changedCount: created + updated,
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
