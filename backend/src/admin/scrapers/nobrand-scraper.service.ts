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

    // 노브랜드버거 메뉴 목록 (사용자가 제공한 23개)
    const nobrandMenus = [
      'NBB 어메이징 감바스 새우',
      'NBB 어메이징 더블',
      'NBB 어메이징 더블 업',
      '고스트페퍼 살사 더블',
      '고스트페퍼 살사 치킨',
      '골든 카츠',
      '골든 모짜카츠',
      '클럽 샌드위치 버거',
      '통마늘 베이컨',
      '치즈',
      '시그니처',
      '더블치즈 베이컨 시그니처',
      '메가바이트',
      '그릴드 불고기',
      '더블 그릴드 불고기',
      '트리플 베이컨',
      '미트 마니아',
      '오리지널',
      '갈릭앤갈릭',
      '오리지널 새우',
      '비스크 치즈 새우',
      '코울슬로 치킨',
      '치폴레 핫 치킨',
    ];

    console.log(`📋 총 ${nobrandMenus.length}개의 메뉴를 처리합니다.`);

    // Puppeteer로 메인 페이지에서 메뉴 정보 추출
    const menuDataMap = new Map<
      string,
      { imageUrl?: string; detailUrl?: string }
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

        // 노브랜드버거 홈페이지로 이동
        console.log(`\n🌐 노브랜드버거 홈페이지 접속 중...`);
        await page.goto(
          'https://www.shinsegaefood.com/nobrandburger/index.sf#none',
          {
            waitUntil: 'networkidle2',
            timeout: 30000,
          },
        );

        // 페이지 로드 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // "View All" 버튼 클릭
        console.log(`\n🔍 "View All" 버튼 클릭 중...`);
        try {
          await page.waitForSelector('button.togArea_btn', { timeout: 10000 });
          await page.click('button.togArea_btn');
          console.log(`  ✅ "View All" 버튼 클릭 성공`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error: any) {
          console.log(`  ⚠️ "View All" 버튼 클릭 실패: ${error.message}`);
        }

        // 메뉴 목록에서 각 메뉴 정보 추출 (cate_218, cate_246)
        console.log(`\n🔍 메뉴 목록에서 정보 추출 중...`);
        const menuItems = await page.evaluate((targetMenus) => {
          const results: Array<{
            name: string;
            imageUrl?: string;
          }> = [];

          // cate_218과 cate_246에서 메뉴 추출
          const categories = ['cate_218', 'cate_246'];
          const normalizeName = (name: string): string => {
            return name.replace(/\s+/g, ' ').trim().toLowerCase();
          };

          categories.forEach((categoryId) => {
            const categoryDiv = document.getElementById(categoryId);
            if (!categoryDiv) return;

            const menuItems = categoryDiv.querySelectorAll('li.menu_item');
            menuItems.forEach((item) => {
              const menuNameEl = item.querySelector('em.menu_name');
              const menuName = menuNameEl?.textContent?.trim() || '';

              if (!menuName) return;

              // 원본 메뉴 이름에서 한글 부분만 추출 (영문 제거)
              const originalName = menuName.split('\n')[0].trim();
              const normalizedMenuName = normalizeName(originalName);

              // 타겟 메뉴 목록과 매칭 (모든 메뉴를 수집하되, 매칭 여부만 확인)
              let matched = false;
              for (const target of targetMenus) {
                const normalizedTarget = normalizeName(target);
                
                // 정확히 일치하거나, 원본 이름이 타겟을 포함하거나, 타겟이 원본 이름을 포함하는 경우
                if (
                  normalizedMenuName === normalizedTarget ||
                  (normalizedMenuName.includes(normalizedTarget) && normalizedTarget.length >= 5) ||
                  (normalizedTarget.includes(normalizedMenuName) && normalizedMenuName.length >= 5)
                ) {
                  matched = true;
                  break;
                }
              }

              if (matched) {
                // 이미지 URL 추출
                const imgEl = item.querySelector('div.menu_img img');
                let imageUrl = '';
                if (imgEl) {
                  const src = imgEl.getAttribute('src') || '';
                  if (src) {
                    if (src.startsWith('//')) {
                      imageUrl = `https:${src}`;
                    } else if (src.startsWith('/')) {
                      imageUrl = `https://www.shinsegaefood.com${src}`;
                    } else if (!src.startsWith('http')) {
                      imageUrl = `https://www.shinsegaefood.com/${src}`;
                    } else {
                      imageUrl = src;
                    }
                  }
                }

                results.push({
                  name: menuName, // 전체 이름 저장 (나중에 매칭할 때 사용)
                  imageUrl: imageUrl || undefined,
                });
              }
            });
          });

          return results;
        }, nobrandMenus);

        console.log(`  ✅ ${menuItems.length}개의 메뉴 정보 발견`);

        // 메뉴 데이터 맵에 저장 (각 타겟 메뉴에 대해 가장 정확한 스크랩된 메뉴를 찾음)
        // 이렇게 하면 같은 스크랩된 메뉴가 여러 타겟에 매칭되는 것을 방지할 수 있음
        for (const targetMenu of nobrandMenus) {
          let bestMatch: { name: string; imageUrl?: string } | null = null;
          let bestScore = 0;
          const normalizedTarget = this.normalizeMenuName(targetMenu);

          for (const menuItem of menuItems) {
            // 원본 메뉴 이름에서 한글 부분만 추출 (영문 제거)
            const originalName = menuItem.name.split('\n')[0].trim();
            const normalizedMenuName = this.normalizeMenuName(originalName);
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
              score = (normalizedTarget.length / normalizedMenuName.length) * 95;
            }
            // 3. 타겟이 원본 이름을 완전히 포함하는 경우 (원본이 최소 5글자 이상)
            else if (
              normalizedTarget.includes(normalizedMenuName) &&
              normalizedMenuName.length >= 5
            ) {
              score = (normalizedMenuName.length / normalizedTarget.length) * 95;
            }

            // 4. 키워드 매칭 (공통 단어가 많을수록 높은 점수)
            const targetWords = normalizedTarget.split(/\s+/).filter((w) => w.length > 1);
            const menuWords = normalizedMenuName.split(/\s+/).filter((w) => w.length > 1);
            const commonWords = targetWords.filter((w) => menuWords.includes(w));
            if (commonWords.length > 0) {
              const keywordScore =
                (commonWords.length / Math.max(targetWords.length, menuWords.length)) * 85;
              if (keywordScore > score) {
                score = keywordScore;
              }
            }

            // 최고 점수 업데이트 (75점 이상만 허용)
            // 더 높은 점수이거나, 같은 점수면 원본 이름이 더 긴 것을 우선 (더 정확한 매칭)
            if (score >= 75) {
              if (
                score > bestScore ||
                (score === bestScore && originalName.length > (bestMatch?.name.split('\n')[0].trim().length || 0))
              ) {
                bestMatch = menuItem;
                bestScore = score;
              }
            }
          }

          if (bestMatch && bestScore >= 75) {
            menuDataMap.set(targetMenu, {
              imageUrl: bestMatch.imageUrl,
              detailUrl: `https://www.shinsegaefood.com/nobrandburger/index.sf#none`,
            });

            const originalName = bestMatch.name.split('\n')[0].trim();
            console.log(
              `  ✅ 발견: "${targetMenu}" (원본 이름: "${originalName}", 점수: ${bestScore.toFixed(1)})${bestMatch.imageUrl ? ` - 이미지: ${bestMatch.imageUrl.substring(0, 60)}...` : ''}`,
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
      'NBB 어메이징 더블 업': {
        kcal: 725,
        protein: 32,
        sodium: 1433,
        sugar: 9,
        saturatedFat: 15,
      },
      '시그니처': {
        kcal: 531,
        protein: 21,
        sodium: 1138,
        sugar: 9,
        saturatedFat: 9,
      },
      '오리지널': {
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
      '갈릭앤갈릭': {
        kcal: 486,
        protein: 16,
        sodium: 733,
        sugar: 6,
        saturatedFat: 6,
      },
      '메가바이트': {
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
      '트리플 베이컨': {
        kcal: 644,
        protein: 33,
        sodium: 1673,
        sugar: 9,
        saturatedFat: 10,
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
      '치즈': {
        kcal: 423,
        protein: 14,
        sodium: 816,
        sugar: 7,
        saturatedFat: 8,
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
      console.log(
        `  ✅ 영양성분 매핑: ${menuName} -> 칼로리: ${nutritionData.kcal}kcal, 단백질: ${nutritionData.protein}g, 나트륨: ${nutritionData.sodium}mg`,
      );
    }

    console.log(
      `\n📊 총 ${nutritionMap.size}개의 메뉴에 대한 영양성분 데이터를 매핑했습니다.`,
    );

    // 데이터베이스에 저장
    console.log(`\n💾 데이터베이스에 저장 중...`);

    for (const targetMenu of nobrandMenus) {
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
      total: nobrandMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
