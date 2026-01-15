import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestLog } from './entities/ingest-log.entity';
import { BrandsService } from '../brands/brands.service';
import { MenuItem } from '../menu-items/entities/menu-item.entity';
import { Nutrition } from '../nutrition/entities/nutrition.entity';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class AdminService {
  // FatSecret 브랜드 검색어 매핑
  private readonly fatSecretBrandMap: Record<string, string> = {
    mcdonalds: '맥도날드',
    burgerking: '버거킹',
    lotte: '롯데리아',
    momstouch: '맘스터치',
    kfc: 'KFC',
    nobrand: '노브랜드버거',
    frank: '프랭크버거',
  };

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

  async ingestFromFatSecret(brandSlug: string) {
    const brand = await this.brandsService.findOneBySlug(brandSlug);
    if (!brand) {
      throw new NotFoundException(`브랜드 '${brandSlug}'를 찾을 수 없습니다.`);
    }

    const searchKeyword = this.fatSecretBrandMap[brandSlug];
    if (!searchKeyword) {
      throw new NotFoundException(
        `브랜드 '${brandSlug}'에 대한 FatSecret 검색어가 없습니다.`,
      );
    }

    let savedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // FatSecret 검색 URL (실제 검색 페이지 형식)
      // 검색 결과 페이지: https://www.fatsecret.kr/칼로리-영양소/search?q=맥도날드
      const searchUrl = `https://www.fatsecret.kr/%EC%B9%BC%EB%A1%9C%EB%A6%AC-%EC%98%81%EC%96%91%EC%86%8C/search?q=${encodeURIComponent(searchKeyword)}`;

      console.log('🔍 검색 URL:', searchUrl);

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

      const $ = cheerio.load(searchResponse.data);

      // 디버깅: 검색 결과 페이지 구조 확인
      console.log('📄 페이지 제목:', $('title').text());
      console.log('🔗 링크 개수:', $('a').length);

      // 메뉴 링크 추출 (FatSecret 실제 구조 기반)
      const menuLinks: string[] = [];

      // 방법 1: a.prominent 클래스를 가진 링크 찾기 (메뉴 이름 링크)
      // URL이 인코딩되어 있으므로 인코딩된 문자열도 체크
      $('a.prominent').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) {
          // URL 인코딩된 문자열도 포함하여 체크
          const decodedHref = decodeURIComponent(href);
          if (
            href.includes('/칼로리-영양소/') ||
            href.includes(
              '%EC%B9%BC%EB%A1%9C%EB%A6%AC-%EC%98%81%EC%96%91%EC%86%8C',
            ) ||
            decodedHref.includes('/칼로리-영양소/')
          ) {
            // 브랜드 페이지 링크는 제외 (메뉴 상세 페이지만)
            const text = $(elem).text().trim();
            if (text && !text.startsWith('(') && text !== '영양 정보') {
              const fullUrl = href.startsWith('http')
                ? href
                : `https://www.fatsecret.kr${href}`;
              if (!menuLinks.includes(fullUrl)) {
                menuLinks.push(fullUrl);
              }
            }
          }
        }
      });

      // 방법 2: tr td 안의 a.prominent 찾기 (더 구체적인 셀렉터)
      if (menuLinks.length === 0) {
        $('tr td a.prominent').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href) {
            const decodedHref = decodeURIComponent(href);
            if (
              href.includes('/칼로리-영양소/') ||
              href.includes(
                '%EC%B9%BC%EB%A1%9C%EB%A6%AC-%EC%98%81%EC%96%91%EC%86%8C',
              ) ||
              decodedHref.includes('/칼로리-영양소/')
            ) {
              const text = $(elem).text().trim();
              if (text && !text.startsWith('(') && text !== '영양 정보') {
                const fullUrl = href.startsWith('http')
                  ? href
                  : `https://www.fatsecret.kr${href}`;
                if (!menuLinks.includes(fullUrl)) {
                  menuLinks.push(fullUrl);
                }
              }
            }
          }
        });
      }

      // 방법 3: href 패턴으로 찾기 (최후의 수단)
      if (menuLinks.length === 0) {
        $(
          'a[href*="/칼로리-영양소/"], a[href*="%EC%B9%BC%EB%A1%9C%EB%A6%AC-%EC%98%81%EC%96%91%EC%86%8C"]',
        ).each((i, elem) => {
          const href = $(elem).attr('href');
          if (href) {
            const text = $(elem).text().trim();
            // 브랜드 링크는 제외 (메뉴 상세 페이지만 - URL에 메뉴 이름이 3단계 이상인 경우)
            // 예: /칼로리-영양소/맥도날드/빅맥/1개 (3단계 이상)
            // 브랜드: /칼로리-영양소/맥도날드 (2단계)
            const pathParts = href
              .split('/')
              .filter((p) => p && !p.includes('%'));
            const isMenuDetail = pathParts.length >= 3; // 메뉴 상세 페이지

            if (
              text &&
              !text.startsWith('(') &&
              text !== '영양 정보' &&
              isMenuDetail
            ) {
              const fullUrl = href.startsWith('http')
                ? href
                : `https://www.fatsecret.kr${href}`;
              if (!menuLinks.includes(fullUrl)) {
                menuLinks.push(fullUrl);
              }
            }
          }
        });
      }

      console.log(`✅ 발견된 메뉴 링크: ${menuLinks.length}개`);
      if (menuLinks.length === 0) {
        console.log('⚠️ 메뉴 링크를 찾을 수 없습니다. 셀렉터를 확인하세요.');
        console.log('📋 페이지 HTML 구조 분석 중...');

        // 디버깅: 모든 링크 출력
        const allLinks: Array<{
          href: string;
          text: string;
          selector: string;
        }> = [];
        $('a').each((i, elem) => {
          const href = $(elem).attr('href');
          const text = $(elem).text().trim();
          if (href) {
            // 셀렉터 생성 시도
            let selector = '';
            const classes = $(elem).attr('class');
            const id = $(elem).attr('id');
            if (id) {
              selector = `#${id}`;
            } else if (classes) {
              selector = `a.${classes.split(' ').join('.')}`;
            } else {
              selector = 'a';
            }

            allLinks.push({ href, text, selector });
          }
        });

        // 관련 링크만 필터링하여 출력
        const relevantLinks = allLinks.filter(
          (link) =>
            link.href.includes('칼로리') ||
            link.href.includes('영양') ||
            link.href.includes('mcdonalds') ||
            link.href.includes('맥도날드') ||
            link.text.includes('맥도날드') ||
            link.text.includes('버거'),
        );

        console.log(`\n🔍 관련 링크 발견: ${relevantLinks.length}개`);
        relevantLinks.slice(0, 20).forEach((link, idx) => {
          console.log(`  [${idx + 1}] ${link.text}`);
          console.log(`      URL: ${link.href}`);
          console.log(`      셀렉터: ${link.selector}`);
        });

        // HTML 구조 샘플 출력
        console.log('\n📄 HTML 구조 샘플:');
        const sampleTable = $('table').first();
        if (sampleTable.length > 0) {
          console.log('  테이블 발견:', sampleTable.length, '개');
          sampleTable
            .find('tr')
            .slice(0, 3)
            .each((i, tr) => {
              const rowText = $(tr).text().trim().substring(0, 100);
              console.log(`    행 ${i + 1}: ${rowText}...`);
            });
        } else {
          console.log('  ⚠️ 테이블을 찾을 수 없습니다.');
        }
      }

      // 각 메뉴 상세 페이지에서 데이터 추출
      const maxItems = Math.min(menuLinks.length, 50); // 최대 50개
      console.log(`📦 처리할 메뉴: ${maxItems}개`);

      for (let i = 0; i < maxItems; i++) {
        const menuUrl = menuLinks[i];
        try {
          await this.delay(500); // 0.5초 대기 (서버 부하 방지)

          console.log(`\n[${i + 1}/${maxItems}] 처리 중: ${menuUrl}`);

          const menuData = await this.scrapeMenuFromFatSecret(
            menuUrl,
            brand.id,
          );
          if (menuData && menuData.name) {
            // 기존 메뉴 확인 (이름과 브랜드로)
            const existing = await this.menuItemsRepository.findOne({
              where: {
                brandId: brand.id,
                name: menuData.name,
              },
            });

            if (existing) {
              // 기존 메뉴 업데이트
              existing.category = menuData.category;
              existing.imageUrl = menuData.imageUrl || existing.imageUrl;
              existing.detailUrl = menuUrl;
              await this.menuItemsRepository.save(existing);

              // 영양정보 업데이트
              if (menuData.nutrition) {
                const existingNutrition =
                  await this.nutritionRepository.findOne({
                    where: { menuItemId: existing.id },
                  });

                if (existingNutrition) {
                  Object.assign(existingNutrition, menuData.nutrition);
                  await this.nutritionRepository.save(existingNutrition);
                } else {
                  const nutrition = this.nutritionRepository.create({
                    menuItemId: existing.id,
                    ...menuData.nutrition,
                  });
                  await this.nutritionRepository.save(nutrition);
                }
              }

              console.log(`  ✅ 업데이트: ${menuData.name}`);
            } else {
              // 새 메뉴 생성
              const menuItem = this.menuItemsRepository.create({
                brandId: brand.id,
                name: menuData.name,
                category: menuData.category,
                imageUrl: menuData.imageUrl,
                detailUrl: menuUrl,
                isActive: true,
              });

              const savedMenuItem =
                await this.menuItemsRepository.save(menuItem);

              // 영양정보 추가
              if (menuData.nutrition) {
                const nutrition = this.nutritionRepository.create({
                  menuItemId: savedMenuItem.id,
                  ...menuData.nutrition,
                });
                await this.nutritionRepository.save(nutrition);
              }

              console.log(`  ✅ 생성: ${menuData.name}`);
            }

            savedCount++;
          } else {
            console.log(`  ⚠️ 데이터 추출 실패`);
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          const errorMsg = `${menuUrl}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`  ❌ 에러: ${errorMsg}`);
        }
      }

      // 수집 로그 저장
      await this.createIngestLog({
        brandId: brand.id,
        status: errorCount === 0 ? 'success' : 'partial',
        changedCount: savedCount,
        error:
          errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : undefined,
      });

      console.log(`\n📊 수집 완료: 저장 ${savedCount}개, 에러 ${errorCount}개`);

      return {
        success: true,
        brand: brand.name,
        totalProcessed: maxItems,
        saved: savedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10),
      };
    } catch (error: any) {
      // 수집 로그 저장 (실패)
      await this.createIngestLog({
        brandId: brand.id,
        status: 'error',
        changedCount: savedCount,
        error: error.message,
      });

      console.error('❌ 수집 실패:', error.message);
      throw error;
    }
  }

  private async scrapeMenuFromFatSecret(
    url: string,
    brandId: string,
  ): Promise<{
    name: string;
    category: string;
    imageUrl?: string;
    nutrition?: Partial<Nutrition>;
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

      // 디버깅 정보 (필요시 주석 해제)
      // console.log('  📄 페이지 제목:', $('title').text());
      // console.log('  🔍 H1 태그들:', $('h1').map((i, el) => $(el).text()).get());

      // 메뉴 이름 추출 (FatSecret 실제 구조 기반)
      let name = '';

      // 방법 1: h1 태그에서 추출 (가장 일반적)
      name = $('h1').first().text().trim();

      // 방법 2: 메타 태그에서 추출 (대체)
      if (!name) {
        name = $('meta[property="og:title"]').attr('content')?.trim() || '';
      }

      // 방법 3: 페이지 제목에서 추출 (최후의 수단)
      if (!name) {
        const title = $('title').text();
        // "빅맥 | 칼로리 및 영양 정보" 형식에서 추출
        name = title.split('|')[0].trim();
      }

      if (!name) {
        console.log('  ⚠️ 메뉴 이름을 찾을 수 없습니다.');
        return null;
      }

      // 카테고리 추정 (메뉴 이름 기반)
      const category = this.inferCategory(name);

      // 이미지 URL 추출 (실제 사이트 구조에 맞게 수정 필요)
      let imageUrl: string | undefined;

      // 방법 1: 특정 클래스의 이미지
      imageUrl =
        $('img.food-image').attr('src') ||
        $('img.foodImage').attr('src') ||
        undefined;

      // 방법 2: alt 속성으로 찾기
      if (!imageUrl) {
        imageUrl = $(`img[alt*="${name}"]`).attr('src') || undefined;
      }

      // 방법 3: 메타 태그에서 추출
      if (!imageUrl) {
        imageUrl = $('meta[property="og:image"]').attr('content') || undefined;
      }

      // 상대 경로를 절대 경로로 변환
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = imageUrl.startsWith('/')
          ? `https://www.fatsecret.kr${imageUrl}`
          : `https://www.fatsecret.kr/${imageUrl}`;
      }

      // 영양정보 추출 (FatSecret 실제 구조 기반)
      // FatSecret은 <div class="nutrition_facts"> 구조를 사용함
      const nutrition: Partial<Nutrition> = {};

      // 값 파싱 헬퍼 함수 (단위 제거 및 검증)
      const parseNutritionValue = (
        text: string,
        isInteger: boolean = false,
      ): number | null => {
        if (!text) return null;

        // 단위 제거 (g, mg, kcal, kJ 등)
        let cleaned = text
          .replace(/[^\d.]/g, '') // 숫자와 점만 남기기
          .trim();

        if (!cleaned) return null;

        const parsed = isInteger ? parseInt(cleaned, 10) : parseFloat(cleaned);

        // 유효성 검증
        if (isNaN(parsed) || !isFinite(parsed)) return null;

        // 범위 검증
        if (isInteger) {
          // integer 타입: 0 ~ 2,147,483,647
          if (parsed < 0 || parsed > 2147483647) return null;
          return Math.floor(parsed);
        } else {
          // decimal 타입: 0 ~ 10000
          if (parsed < 0 || parsed > 10000) return null;
          return parsed;
        }
      };

      // 방법 1: nutrition_facts div 구조에서 추출 (FatSecret 실제 구조)
      const nutritionFacts = $('.nutrition_facts');

      if (nutritionFacts.length > 0) {
        // 모든 nutrient 요소를 순회하면서 라벨-값 쌍 찾기
        const nutrients = nutritionFacts.find('.nutrient');

        nutrients.each((i, elem) => {
          const $elem = $(elem);
          const text = $elem.text().trim();
          const classes = $elem.attr('class') || '';

          // 라벨인 경우 (left 클래스가 있고 sub가 아닌 경우)
          if ($elem.hasClass('left') && !$elem.hasClass('sub')) {
            const labelLower = text.toLowerCase();

            // 열량 (kcal) - "열량" 라벨 다음에 "583 kcal" 값이 있음
            if (labelLower.includes('열량') || labelLower.includes('calorie')) {
              // 다음 형제 요소들 중 "kcal"이 포함된 값 찾기
              let found = false;
              $elem.nextAll('.nutrient').each((j, nextElem) => {
                if (found) return false;
                const nextText = $(nextElem).text().trim();
                if (nextText.includes('kcal')) {
                  const value = parseNutritionValue(nextText, true);
                  if (value !== null && !nutrition.kcal) {
                    nutrition.kcal = value;
                    found = true;
                    return false; // break
                  }
                }
              });
            }
            // 탄수화물
            else if (
              labelLower.includes('탄수화물') ||
              labelLower.includes('carbohydrate') ||
              labelLower.includes('carb')
            ) {
              const $nextValue = $elem.next('.nutrient.right');
              if ($nextValue.length > 0) {
                const valueText = $nextValue.text().trim();
                const value = parseNutritionValue(valueText, false);
                if (value !== null && !nutrition.carbohydrate)
                  nutrition.carbohydrate = value;
              }
            }
            // 단백질
            else if (
              labelLower.includes('단백질') ||
              labelLower.includes('protein')
            ) {
              const $nextValue = $elem.next('.nutrient.right');
              if ($nextValue.length > 0) {
                const valueText = $nextValue.text().trim();
                const value = parseNutritionValue(valueText, false);
                if (value !== null && !nutrition.protein)
                  nutrition.protein = value;
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
                const value = parseNutritionValue(valueText, false);
                if (value !== null && !nutrition.fat) nutrition.fat = value;
              }
            }
            // 나트륨
            else if (
              labelLower.includes('나트륨') ||
              labelLower.includes('sodium')
            ) {
              const $nextValue = $elem.next('.nutrient.right');
              if ($nextValue.length > 0) {
                const valueText = $nextValue.text().trim();
                const value = parseNutritionValue(valueText, true);
                if (value !== null && !nutrition.sodium)
                  nutrition.sodium = value;
              }
            }
          }
        });

        // 설탕당 (탄수화물의 하위 항목) - sub 클래스로 표시됨
        nutritionFacts.find('.nutrient.sub.left').each((i, elem) => {
          const $elem = $(elem);
          const text = $elem.text().trim().toLowerCase();

          if (
            text.includes('설탕') ||
            text.includes('당류') ||
            text.includes('sugar') ||
            text.includes('sugars')
          ) {
            const $nextValue = $elem.next('.nutrient.right');
            if ($nextValue.length > 0) {
              const valueText = $nextValue.text().trim();
              const value = parseNutritionValue(valueText, false);
              if (value !== null && !nutrition.sugar) nutrition.sugar = value;
            }
          }
        });
      }

      // 방법 2: 대체 방법 - 테이블 구조가 있는 경우 (구버전 호환)
      if (Object.keys(nutrition).length === 0) {
        $('table tr').each((i, elem) => {
          const cells = $(elem).find('td, th');
          if (cells.length < 2) return;

          const label = $(cells[0]).text().toLowerCase().trim();
          const valueText = $(cells[1]).text().trim();

          if (
            label.includes('칼로리') ||
            label.includes('calorie') ||
            label.includes('kcal')
          ) {
            const value = parseNutritionValue(valueText, true);
            if (value !== null && !nutrition.kcal) nutrition.kcal = value;
          } else if (label.includes('단백질') || label.includes('protein')) {
            const value = parseNutritionValue(valueText, false);
            if (value !== null && !nutrition.protein) nutrition.protein = value;
          } else if (label.includes('지방') && !label.includes('포화')) {
            if (label.includes('fat') && !label.includes('saturated')) {
              const value = parseNutritionValue(valueText, false);
              if (value !== null && !nutrition.fat) nutrition.fat = value;
            }
          } else if (label.includes('나트륨') || label.includes('sodium')) {
            const value = parseNutritionValue(valueText, true);
            if (value !== null && !nutrition.sodium) nutrition.sodium = value;
          } else if (
            label.includes('당류') ||
            label.includes('sugar') ||
            label.includes('sugars')
          ) {
            const value = parseNutritionValue(valueText, false);
            if (value !== null && !nutrition.sugar) nutrition.sugar = value;
          } else if (
            label.includes('탄수화물') ||
            label.includes('carb') ||
            label.includes('carbohydrate')
          ) {
            const value = parseNutritionValue(valueText, false);
            if (value !== null && !nutrition.carbohydrate)
              nutrition.carbohydrate = value;
          }
        });
      }

      // 디버깅: 추출된 데이터 확인
      if (Object.keys(nutrition).length === 0) {
        console.log(`  ⚠️ 영양정보를 찾을 수 없습니다: ${url}`);
        console.log(
          `  📄 nutrition_facts div 개수: ${$('.nutrition_facts').length}`,
        );
        console.log(`  📄 테이블 개수: ${$('table').length}`);

        // nutrition_facts 구조 샘플 출력
        const nutritionFacts = $('.nutrition_facts').first();
        if (nutritionFacts.length > 0) {
          console.log('  📋 nutrition_facts 구조:');
          nutritionFacts
            .find('.nutrient.left, .nutrient.right')
            .slice(0, 10)
            .each((i, elem) => {
              const $elem = $(elem);
              const text = $elem.text().trim();
              const classes = $elem.attr('class') || '';
              console.log(`    [${i + 1}] ${classes}: "${text}"`);
            });
        }
      } else {
        // 성공적으로 파싱된 경우 로그 출력 (선택적)
        // console.log(`  ✅ 영양정보 추출 성공:`, nutrition);
      }

      return {
        name,
        category,
        imageUrl,
        nutrition: Object.keys(nutrition).length > 0 ? nutrition : undefined,
      };
    } catch (error: any) {
      console.error(`  ❌ 스크래핑 실패 (${url}):`, error.message);
      return null;
    }
  }

  private inferCategory(name: string): string {
    const lowerName = name.toLowerCase();

    if (
      lowerName.includes('버거') ||
      lowerName.includes('burger') ||
      lowerName.includes('와퍼') ||
      lowerName.includes('햄버거')
    ) {
      return 'burger';
    } else if (
      lowerName.includes('치킨') ||
      lowerName.includes('chicken') ||
      lowerName.includes('닭')
    ) {
      return 'chicken';
    } else if (
      lowerName.includes('음료') ||
      lowerName.includes('drink') ||
      lowerName.includes('콜라') ||
      lowerName.includes('커피') ||
      lowerName.includes('주스') ||
      lowerName.includes('아이스크림')
    ) {
      return 'drink';
    } else {
      return 'side';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
