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
import * as puppeteer from 'puppeteer';

@Injectable()
export class LotteriaScraperService extends BaseScraperService {
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
    const brand = await this.brandsService.findOneBySlug('lotteria');
    if (!brand) {
      throw new NotFoundException('롯데리아 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 롯데리아 메뉴 수집 시작...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    const lotteriaSourceUrl =
      'https://www.lotteeatz.com/upload/etc/ria/items.html';
    const lotteriaProductUrl = (productId: string) =>
      `https://www.lotteeatz.com/products/introductions/${productId}?brandCode=LOTTERIA&rccode=brnd_main`;
    const lotteriaSourceMenuSuffixes: Record<string, string> = {
      '리아 두툼새우': '달걀',
      '리아 두툼새우 스파이시토마토': '달걀',
      '하와이안 모짜렐라버거': '달걀',
      번트비프버거: '달걀',
      '통다리 크리스피치킨버거(파이어핫)': '달걀',
      '통다리 크리스피치킨버거(그릭랜치)': '달걀',
      '나폴리 모짜렐라버거 발사믹바질': '달걀',
      '나폴리 모짜렐라버거 토마토바질': '달걀',
      '전주 비빔라이스 버거': '달걀',
      '리아 새우 베이컨': '달걀',
      '리아 불고기 베이컨': '달걀',
      '더블 한우불고기버거': '달걀',
      한우불고기버거: '달걀',
      '더블 클래식치즈버거': '달걀',
      '더블 치킨버거(N)': '달걀',
      '더블 치킨버거': '달걀',
      '더블 데리버거': '달걀',
      더블엑스투버거: '달걀',
      '리아 불고기 더블(빅불)': '밀',
      미라클버거: '밀',
      '더블 미라클버거': '밀',
      '모짜렐라 인 더 버거 베이컨': '달걀',
      핫크리스피치킨버거: '달걀',
      '리아 사각새우 더블': '달걀',
      클래식치즈버거: '달걀',
      '리아 불고기': '밀',
      '리아 새우': '달걀',
      치킨버거: '달걀',
      데리버거: '달걀',
    };
    const lotteriaSourceMenuUrl = (menuName: string) => {
      const suffix = lotteriaSourceMenuSuffixes[menuName];
      const text = encodeURIComponent(menuName);
      return suffix
        ? `${lotteriaSourceUrl}#:~:text=${text},-${encodeURIComponent(suffix)}`
        : `${lotteriaSourceUrl}#:~:text=${text}`;
    };

    const productFallbacks: Record<
      string,
      {
        productId: string;
        description?: string;
        imageUrl?: string;
      }
    > = {
      '리아 두툼새우': {
        productId: 'REP_000998',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2026/07/15/20260715141202435_8.png/dims/resize/x214/optimize',
        description:
          '탱글 두툼한 새우패티로 새우 본연의 풍미를 깔끔하게 끌어올린 리아 새우 한정판',
      },
      '리아 두툼새우 스파이시토마토': {
        productId: 'REP_000999',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2026/07/15/20260715141146741_5.png/dims/resize/x214/optimize',
        description:
          '매콤한 토마토소스에 딱새우의 머리부터 껍질까지 농축한 액기스를 더해 은은한 감칠맛을 끌어올린 리아 새우 한정판',
      },
      '하와이안 모짜렐라버거': {
        productId: 'REP_000979',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2026/06/17/20260617080434865_4.jpg/dims/resize/x214/optimize',
        description:
          '달콤한 파인애플과 쭉 늘어나는 모짜렐라, 나폴리탄 소스를 더해 완벽한 단짠 조합의 모짜렐라버거',
      },
      번트비프버거: {
        productId: 'REP_000922',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2026/04/17/20260417142700466_3.png',
        description:
          '재료 하나하나의 감칠맛과 원료 본연의 풍미를 최대한 끌어올린 맛으로 꽉찬 파인다이닝 셰프의 비프버거',
      },
      '나폴리 모짜렐라버거 토마토바질': {
        productId: 'REP_000581',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2025/01/15/20250115162931395_8.png',
        description:
          '바질의 신선함을 담은 바질마요소스에 풍부하고 진한 토마토소스로 맛을 낸 스페셜 모짜렐라버거',
      },
      '나폴리 모짜렐라버거 발사믹바질': {
        productId: 'REP_000582',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2025/01/15/20250115163300416_3.png',
        description:
          '바질의 신선함을 담은 바질마요소스에 레드와인 발사믹의 산뜻함을 더한 스페셜 모짜렐라버거',
      },
      미라클버거: {
        productId: 'REP_000349',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2025/10/16/20251016134637371_3.png',
        description: '100% 식물성 패티와 신선한 야채들이 조화된 대체육버거',
      },
      '더블 미라클버거': {
        productId: 'REP_000350',
        imageUrl:
          'https://img.lotteeatz.com/upload/product/2025/10/16/20251016134709789_6.png',
        description: '100% 식물성 패티와 신선한 야채들이 조화된 대체육버거',
      },
    };

    // 롯데리아 버거 메뉴 목록 (영양성분표 2026.07 기준)
    const lotteriaMenus = [
      '리아 두툼새우',
      '리아 두툼새우 스파이시토마토',
      '하와이안 모짜렐라버거',
      '번트비프버거',
      '통다리 크리스피치킨버거(파이어핫)',
      '통다리 크리스피치킨버거(그릭랜치)',
      '나폴리 모짜렐라버거 발사믹바질',
      '나폴리 모짜렐라버거 토마토바질',
      '전주 비빔라이스 버거',
      '리아 새우 베이컨',
      '리아 불고기 베이컨',
      '더블 한우불고기버거',
      '한우불고기버거',
      '더블 클래식치즈버거',
      '더블 치킨버거(N)',
      '더블 치킨버거',
      '더블 데리버거',
      '더블엑스투버거',
      '리아 불고기 더블(빅불)',
      '미라클버거',
      '더블 미라클버거',
      '모짜렐라 인 더 버거 베이컨',
      '핫크리스피치킨버거',
      '리아 사각새우 더블',
      '클래식치즈버거',
      '리아 불고기',
      '리아 새우',
      '치킨버거',
      '데리버거',
    ];

    console.log(`📋 총 ${lotteriaMenus.length}개의 메뉴를 처리합니다.`);

    // Puppeteer로 메인 페이지에서 메뉴 정보 추출
    const menuDataMap = new Map<
      string,
      {
        productId: string;
        imageUrl?: string;
        detailUrl?: string;
        description?: string;
      }
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

        // 롯데리아 브랜드 페이지로 이동
        console.log(`\n🌐 롯데리아 브랜드 페이지 접속 중...`);
        await page.goto('https://www.lotteeatz.com/brand/ria', {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // 페이지 로드 대기
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // "버거" 탭 클릭
        console.log(`\n🔍 "버거" 탭 클릭 중...`);
        try {
          await page.waitForSelector('a.tab-link', { timeout: 10000 });
          const tabLinks = await page.$$('a.tab-link');

          for (const tabLink of tabLinks) {
            const tabText = await page.evaluate((el) => {
              const span = el.querySelector('span.tab-text');
              return span ? span.textContent?.trim() : '';
            }, tabLink);

            if (tabText === '버거') {
              await page.evaluate((el) => {
                (el as HTMLElement).click();
              }, tabLink);
              console.log(`  ✅ "버거" 탭 클릭 성공`);
              break;
            }
          }

          // 탭 클릭 후 메뉴가 로드될 때까지 대기
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error: any) {
          console.log(`  ⚠️ "버거" 탭 클릭 실패: ${error.message}`);
        }

        // 메뉴 목록에서 각 메뉴 정보 추출
        console.log(`\n🔍 메뉴 목록에서 정보 추출 중...`);
        const menuItems = await page.evaluate((targetMenus) => {
          const results: Array<{
            name: string;
            productId: string;
            imageUrl?: string;
          }> = [];

          // 모든 .btn-link 요소 찾기
          const links = document.querySelectorAll('a.btn-link');

          links.forEach((link) => {
            const onclick = link.getAttribute('onclick') || '';
            // goBrandDetail('REP_000815') 패턴에서 productId 추출
            const match = onclick.match(/goBrandDetail\(['"]([^'"]+)['"]\)/);
            if (!match) return;

            const productId = match[1];
            const linkText = link.textContent?.trim() || '';

            // GA_Event에서 메뉴 이름 추출 시도
            const gaMatch = onclick.match(
              /GA_Event\([^,]+,[^,]+,[^,]+,\s*['"]([^'"]+)['"]\)/,
            );
            const menuName = gaMatch ? gaMatch[1] : linkText;

            // 타겟 메뉴 목록과 매칭
            const normalizedMenuName = menuName
              .replace(/\s+/g, '')
              .toLowerCase();
            const matchedTarget = targetMenus.find((target) => {
              const normalizedTarget = target.replace(/\s+/g, '').toLowerCase();
              return (
                normalizedMenuName === normalizedTarget ||
                normalizedMenuName.includes(normalizedTarget) ||
                normalizedTarget.includes(normalizedMenuName)
              );
            });

            if (matchedTarget) {
              results.push({
                name: matchedTarget,
                productId,
              });
            }
          });

          return results;
        }, lotteriaMenus);

        console.log(`  ✅ ${menuItems.length}개의 메뉴 링크 발견`);

        // 각 메뉴의 상세 페이지에서 이미지 URL 추출
        for (let i = 0; i < menuItems.length; i++) {
          const menuItem = menuItems[i];
          try {
            await this.delay(1000); // 서버 부하 방지

            console.log(
              `\n[${i + 1}/${menuItems.length}] 처리 중: ${menuItem.name} (ID: ${menuItem.productId})`,
            );

            const detailUrl = lotteriaProductUrl(menuItem.productId);

            // 상세 페이지로 이동
            await page.goto(detailUrl, {
              waitUntil: 'networkidle2',
              timeout: 30000,
            });

            await new Promise((resolve) => setTimeout(resolve, 2000));

            // 이미지 URL 및 description 추출
            const pageData = await page.evaluate(() => {
              const result: {
                imageUrl?: string;
                description?: string;
              } = {};

              // 이미지 URL 추출 (background-image 스타일에서)
              const thumbImg = document.querySelector('div.thumb-img');
              if (thumbImg) {
                const style = thumbImg.getAttribute('style') || '';
                const match = style.match(
                  /background-image:\s*url\(['"]?([^'"]+)['"]?\)/,
                );
                if (match) {
                  result.imageUrl = match[1];
                }
              }

              // description 추출 (p.btext 요소에서)
              const descriptionEl = document.querySelector('p.btext');
              if (descriptionEl) {
                const descriptionText = descriptionEl.textContent?.trim() || '';
                if (descriptionText) {
                  result.description = descriptionText;
                }
              }

              return result;
            });

              menuDataMap.set(menuItem.name, {
                productId: menuItem.productId,
                imageUrl: pageData.imageUrl,
                detailUrl: lotteriaSourceMenuUrl(menuItem.name),
                description: pageData.description,
              });

            if (pageData.imageUrl) {
              console.log(
                `    📷 이미지 URL 발견: ${pageData.imageUrl.substring(0, 80)}...`,
              );
            } else {
              console.log(`    ⚠️ 이미지 URL을 찾을 수 없음`);
            }

            if (pageData.description) {
              console.log(
                `    📝 description 발견: ${pageData.description.substring(0, 60)}...`,
              );
            } else {
              console.log(`    ⚠️ description을 찾을 수 없음`);
            }
          } catch (error: any) {
            console.log(`    ⚠️ 상세 페이지 처리 실패: ${error.message}`);
            // 상세 페이지 실패해도 기본 정보는 저장
            menuDataMap.set(menuItem.name, {
              productId: menuItem.productId,
              detailUrl: lotteriaSourceMenuUrl(menuItem.name),
            });
          }
        }

        await page.close();
      } finally {
        await browser.close();
      }
    } catch (error: any) {
      console.error(`❌ Puppeteer 오류: ${error.message}`);
      errors++;
      errorDetails.push(`Puppeteer 오류: ${error.message}`);
    }

    // 영양성분 정보 추출 (별도 페이지에서)
    console.log(`\n📊 영양성분 정보 추출 중...`);
    const nutritionMap = new Map<string, any>();

    try {
      // 재시도 로직 (최대 3번 시도)
      let nutritionResponse: any = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          nutritionResponse = await axios.get(
            lotteriaSourceUrl,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              proxy: false,
              timeout: 30000, // 30초 타임아웃
            },
          );
          console.log(`  ✅ 영양성분 페이지 접속 성공`);
          break; // 성공하면 루프 종료
        } catch (error: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error; // 최대 재시도 횟수 초과 시 에러 throw
          }
          console.log(
            `  ⚠️ 영양성분 페이지 접속 실패 (시도 ${retryCount}/${maxRetries}), 3초 후 재시도...`,
          );
          await this.delay(3000); // 3초 대기 후 재시도
        }
      }

      if (!nutritionResponse || !nutritionResponse.data) {
        throw new Error('영양성분 페이지 응답 데이터가 없습니다.');
      }

      const $nutrition = cheerio.load(nutritionResponse.data);

      // 테이블 헤더 찾기 (thead에서)
      const thead = $nutrition('thead');
      const headerRow = thead.find('tr').first();
      const headers: string[] = [];
      headerRow.find('th').each((_, cell) => {
        headers.push($nutrition(cell).text().trim());
      });

      // 헤더 인덱스 매핑
      const headerMap: { [key: string]: number } = {};
      headers.forEach((header, index) => {
        if (header.includes('열량') || header.includes('Kcal')) {
          headerMap['kcal'] = index;
        } else if (header.includes('단백질')) {
          headerMap['protein'] = index;
        } else if (header.includes('나트륨')) {
          headerMap['sodium'] = index;
        } else if (header.includes('당류')) {
          headerMap['sugar'] = index;
        } else if (header.includes('포화지방')) {
          headerMap['saturatedFat'] = index;
        }
      });

      console.log(`  📋 헤더 매핑:`, headerMap);

      const normalizeMenuName = (name: string): string => {
        return name
          .replace(/^new\s*/i, '')
          .replace(/\s+/g, '')
          .replace(/나폴리/g, '')
          .replace(/\(버터번\)/g, '')
          .replace(/\(n\)/gi, '')
          .toLowerCase();
      };

      const parseNumber = (value: string): number | undefined => {
        const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
        return match ? Number(match[1]) : undefined;
      };

      const findTargetMenu = (menuName: string): string | undefined => {
        const normalizedMenuName = normalizeMenuName(menuName);

        const exactMatch = lotteriaMenus.find(
          (target) => normalizeMenuName(target) === normalizedMenuName,
        );
        if (exactMatch) {
          return exactMatch;
        }

        const partialMatches = lotteriaMenus
          .map((target) => ({
            target,
            normalizedTarget: normalizeMenuName(target),
          }))
          .filter(({ normalizedTarget }) => {
            if (normalizedTarget.length < 5 || normalizedMenuName.length < 5) {
              return false;
            }
            return (
              normalizedMenuName.includes(normalizedTarget) ||
              normalizedTarget.includes(normalizedMenuName)
            );
          })
          .sort((a, b) => b.normalizedTarget.length - a.normalizedTarget.length);

        return partialMatches[0]?.target;
      };

      let inBurgerSection = false;
      let foundBurgerSection = false;

      $nutrition('tr').each((_, row) => {
        const cells = $nutrition(row).find('th,td');
        if (cells.length === 0) return;

        const values = cells
          .map((__, cell) => $nutrition(cell).text().replace(/\s+/g, ' ').trim())
          .get();
        const sectionName = values[0];

        if (sectionName === '버거메뉴') {
          inBurgerSection = true;
          foundBurgerSection = true;
        } else if (
          inBurgerSection &&
          cells.eq(0).attr('rowspan') &&
          sectionName !== '버거메뉴'
        ) {
          inBurgerSection = false;
        }

        if (!inBurgerSection) return;

        const menuNameIndex = sectionName === '버거메뉴' ? 1 : 0;
        const menuName = values[menuNameIndex];
        if (!menuName || menuName === '버거메뉴') return;

        const matchedMenu = findTargetMenu(menuName);
        if (!matchedMenu) return;

        const nutrition = {
          weight: parseNumber(values[menuNameIndex + 2] ?? ''),
          kcal: parseNumber(values[menuNameIndex + 3] ?? ''),
          protein: parseNumber(values[menuNameIndex + 4] ?? ''),
          sodium: parseNumber(values[menuNameIndex + 5] ?? ''),
          sugar: parseNumber(values[menuNameIndex + 6] ?? ''),
          saturatedFat: parseNumber(values[menuNameIndex + 7] ?? ''),
        };
        const { weight: _weight, ...nutritionEntityFields } = nutrition;
        const cleanedNutrition = Object.fromEntries(
          Object.entries(nutritionEntityFields).filter(
            ([, value]) => value !== undefined,
          ),
        );

        if (Object.keys(cleanedNutrition).length > 0) {
          nutritionMap.set(matchedMenu, cleanedNutrition);
          console.log(
            `    ✅ 영양성분 추출: "${menuName}" -> "${matchedMenu}" -> ${JSON.stringify(cleanedNutrition)}`,
          );
        }
      });

      if (foundBurgerSection) {
        console.log(`  ✅ "버거메뉴" 섹션 발견`);
        console.log(`  📊 총 ${nutritionMap.size}개의 메뉴 영양성분 추출 완료`);
      } else {
        console.log(`  ⚠️ "버거메뉴" 섹션을 찾을 수 없음`);
      }
    } catch (error: any) {
      console.error(`  ❌ 영양성분 페이지 오류: ${error.message}`);
      errors++;
      errorDetails.push(`영양성분 페이지 오류: ${error.message}`);
    }

    for (const targetMenu of lotteriaMenus) {
      const fallback = productFallbacks[targetMenu];
      const current = menuDataMap.get(targetMenu);
      if (!current) {
        menuDataMap.set(targetMenu, {
          productId: fallback?.productId ?? '',
          detailUrl: lotteriaSourceMenuUrl(targetMenu),
          description: fallback?.description,
          imageUrl: fallback?.imageUrl,
        });
      } else if (fallback) {
        menuDataMap.set(targetMenu, {
          ...current,
          productId: current.productId || fallback.productId,
          detailUrl: lotteriaSourceMenuUrl(targetMenu),
          description: current.description || fallback.description,
          imageUrl: current.imageUrl || fallback.imageUrl,
        });
      }
    }

    // 데이터베이스에 저장
    console.log(`\n💾 데이터베이스에 저장 중...`);
    const activeMenuNames: string[] = [];

    for (const targetMenu of lotteriaMenus) {
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
      total: lotteriaMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
