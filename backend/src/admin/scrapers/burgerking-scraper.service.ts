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
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BurgerKingScraperService extends BaseScraperService {
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
    return name
      .replace(/행\)/g, '') // "행)" 제거
      .replace(/세트/g, '') // "세트" 제거
      .replace(/라지/g, '') // "라지" 제거
      .replace(/\(R\)/g, '') // "(R)" 제거
      .replace(/\(L\)/g, '') // "(L)" 제거
      .replace(/\+/g, '') // "+" 제거
      .replace(/X2/g, '') // "X2" 제거
      .replace(/콜라R/g, '') // "콜라R" 제거
      .replace(/콜라L/g, '') // "콜라L" 제거
      .replace(/프라이R/g, '') // "프라이R" 제거
      .replace(/프라이L/g, '') // "프라이L" 제거
      .replace(/\s+/g, ' ') // 여러 공백을 하나로
      .trim()
      .toLowerCase();
  }

  /**
   * 세트/콤보 메뉴인지 확인
   */
  private isSetOrCombo(name: string): boolean {
    const lowerName = name.toLowerCase();
    return (
      lowerName.includes('세트') ||
      lowerName.includes('라지') ||
      lowerName.includes('콤보') ||
      lowerName.includes('+') ||
      lowerName.includes('팩') ||
      lowerName.includes('x2') ||
      lowerName.startsWith('행)')
    );
  }

  /**
   * 메뉴가 단품인지 확인 (세트/콤보가 아닌지)
   */
  private isSingleItem(menu: {
    menuNm?: string;
    menuComponents?: string;
  }): boolean {
    if (!menu.menuNm) return false;

    const menuName = menu.menuNm.toLowerCase();
    const menuComponents = (menu.menuComponents || '').toLowerCase();

    // 세트/콤보 키워드 확인
    const setKeywords = ['세트', '라지', '콤보', 'combo', 'set', 'pack', '팩'];
    const hasSetKeyword = setKeywords.some((keyword) =>
      menuName.includes(keyword),
    );

    // menuComponents에 "+"가 있으면 세트/콤보
    const hasPlusInComponents = menuComponents.includes('+');

    // menuNm에 "+"가 있으면 세트/콤보
    const hasPlusInName = menuName.includes('+');

    // "행)"으로 시작하면 세트
    const startsWithSet = menuName.startsWith('행)');

    // 단품인 경우: 세트 키워드 없음, + 없음, 행)으로 시작하지 않음
    return (
      !hasSetKeyword && !hasPlusInComponents && !hasPlusInName && !startsWithSet
    );
  }

  /**
   * JSON 파일에서 메뉴 이름과 menuCd 매핑을 로드 (단품만)
   */
  private loadMenuCdMap(): Map<string, string> {
    const menuCdMap = new Map<string, string>();
    try {
      const jsonPath = path.join(
        process.cwd(),
        'menu-items-examples',
        'burgerking-menu-data.json',
      );
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

      if (jsonData.body && jsonData.body.allMenuList) {
        for (const menuGroup of jsonData.body.allMenuList) {
          if (menuGroup.menuInfo) {
            for (const menu of menuGroup.menuInfo) {
              // 단품만 처리
              if (menu.menuNm && menu.menuCd && this.isSingleItem(menu)) {
                // 정규화된 이름으로 매핑
                const normalizedName = this.normalizeMenuName(menu.menuNm);
                menuCdMap.set(normalizedName, menu.menuCd);
                // 원본 이름(소문자, 공백 제거)으로도 매핑
                const originalNameLower = menu.menuNm.toLowerCase().trim();
                menuCdMap.set(originalNameLower, menu.menuCd);
                // 공백 제거한 이름으로도 매핑
                const noSpaceName = menu.menuNm
                  .replace(/\s+/g, '')
                  .toLowerCase();
                menuCdMap.set(noSpaceName, menu.menuCd);
                // 정규화 후 공백 제거한 이름으로도 매핑
                const normalizedNoSpace = normalizedName.replace(/\s+/g, '');
                menuCdMap.set(normalizedNoSpace, menu.menuCd);
              }
            }
          }
        }
      }
      console.log(
        `    📋 JSON에서 ${menuCdMap.size}개의 단품 menuCd 매핑을 로드했습니다.`,
      );
    } catch (error) {
      console.error(
        `    ⚠️ JSON 파일 로드 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return menuCdMap;
  }

  /**
   * 버거킹 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
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
    const brand = await this.brandsService.findOneBySlug('burgerking');
    if (!brand) {
      throw new NotFoundException('버거킹 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 버거킹 메뉴 수집 시작...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // 타겟 메뉴 목록
    const targetMenus = [
      '오리지널스 뉴욕 스테이크',
      '오리지널스 이탈리안 살사베르데',
      '더오치 맥시멈2',
      '더오치 맥시멈3',
      '더오치 맥시멈 원파운더',
      '와퍼',
      '치즈와퍼',
      '갈릭불고기와퍼',
      '불고기와퍼',
      '베이컨치즈와퍼',
      '콰트로치즈와퍼',
      '통새우와퍼',
      '몬스터와퍼',
      '콰트로페퍼 큐브스테이크 와퍼',
      '터프페퍼 큐브스테이크',
      '와퍼주니어',
      '콰트로치즈 와퍼주니어',
      '통새우와퍼주니어',
      '불고기와퍼주니어',
      '치즈와퍼주니어',
      '크리스퍼 클래식',
      '크리스퍼 양념 치킨',
      '크리스퍼 불닭 치킨',
      '크리스퍼 클래식 BLT',
      '치킨킹',
      '치킨킹BLT',
      '비프불고기버거',
      '치즈버거',
      '비프&슈림프버거',
      '통새우슈림프버거',
      '슈림프버거',
      '치킨버거',
      '치킨 치즈 마요 버거',
      '더블비프불고기버거',
    ];

    // 타겟 메뉴 정규화 및 Map 생성
    const normalizedTargetMenus = new Map<string, string>();
    targetMenus.forEach((menu) => {
      normalizedTargetMenus.set(this.normalizeMenuName(menu), menu);
    });

    // JSON 파일에서 menuCd 매핑 로드
    const menuCdMap = this.loadMenuCdMap();
    console.log(`📋 총 ${targetMenus.length}개의 타겟 메뉴를 처리합니다.`);
    console.log(
      `📋 JSON에서 ${menuCdMap.size}개의 menuCd 매핑을 로드했습니다.`,
    );

    // 메인 페이지에서 메뉴 정보 추출
    // 버거킹은 Vue.js를 사용하므로 Puppeteer로 동적 콘텐츠를 로드해야 함
    const menuDataMap = new Map<
      string,
      {
        originalName: string;
        imageUrl: string;
        detailUrl: string;
        menuId?: string;
      }
    >();

    try {
      await this.delay(500);
      const mainPageUrl = 'https://www.burgerking.co.kr/menu/main';
      console.log(`\n📄 메인 페이지 처리 중: ${mainPageUrl}`);

      // Puppeteer로 메인 페이지 로드 (Vue.js 앱이므로 동적 콘텐츠 필요)
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        await page.goto(mainPageUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        await this.delay(3000); // Vue 앱 로드 대기

        // 모든 메뉴 카드 정보를 한 번에 수집 (페이지를 다시 로드하지 않음)
        const allMenuCards = await page.evaluate(() => {
          const cards = document.querySelectorAll('.menu_card');
          const result: Array<{
            menuName: string;
            imageUrl: string;
            menuId?: string;
          }> = [];

          cards.forEach((card) => {
            const img = card.querySelector('.prd_image img');
            const title = card.querySelector('.cont .tit span');
            const btn = card.querySelector('.btn_detail');

            const imageUrl = img?.getAttribute('src')?.trim() || '';
            const menuName = title?.textContent?.trim() || '';

            if (!menuName || !imageUrl) {
              return;
            }

            // 이미지 URL을 절대 경로로 변환
            let fullImageUrl = imageUrl;
            if (imageUrl && !fullImageUrl.startsWith('http')) {
              if (fullImageUrl.startsWith('//')) {
                fullImageUrl = `https:${fullImageUrl}`;
              } else if (fullImageUrl.startsWith('/')) {
                fullImageUrl = `https://www.burgerking.co.kr${fullImageUrl}`;
              }
            }

            // data 속성에서 menuId 찾기
            let menuId: string | undefined;
            const dataMenuId =
              card.getAttribute('data-menu-id') ||
              card.getAttribute('data-id') ||
              btn?.getAttribute('data-menu-id') ||
              btn?.getAttribute('data-id') ||
              null;
            if (dataMenuId) {
              menuId = dataMenuId;
            }

            result.push({
              menuName,
              imageUrl: fullImageUrl,
              menuId,
            });
          });

          return result;
        });

        console.log(`  📋 총 ${allMenuCards.length}개의 메뉴 카드 발견`);

        // 메뉴 카드 처리 및 URL 추출
        for (const cardInfo of allMenuCards) {
          try {
            const { menuName, imageUrl, menuId: cardMenuId } = cardInfo;

            if (!menuName || !imageUrl) {
              continue;
            }

            // 세트/콤보 메뉴는 제외
            if (this.isSetOrCombo(menuName)) {
              continue;
            }

            const normalizedName = this.normalizeMenuName(menuName);
            let detailUrl = '';
            let menuId: string | null = cardMenuId || null;

            // JSON 파일에서 menuCd 찾기 (여러 방법 시도)
            let menuCd =
              menuCdMap.get(normalizedName) ||
              menuCdMap.get(menuName.toLowerCase().trim()) ||
              menuCdMap.get(menuName.replace(/\s+/g, '').toLowerCase()) ||
              menuCdMap.get(normalizedName.replace(/\s+/g, ''));

            // 부분 일치로도 찾기 시도
            if (!menuCd) {
              for (const [key, value] of menuCdMap.entries()) {
                const normalizedKey = this.normalizeMenuName(key);
                const normalizedNameNoSpace = normalizedName.replace(
                  /\s+/g,
                  '',
                );
                const normalizedKeyNoSpace = normalizedKey.replace(/\s+/g, '');

                if (
                  normalizedName === normalizedKey ||
                  normalizedNameNoSpace === normalizedKeyNoSpace ||
                  (normalizedName.length >= 3 &&
                    normalizedKey.includes(normalizedName)) ||
                  (normalizedKey.length >= 3 &&
                    normalizedName.includes(normalizedKey)) ||
                  (normalizedNameNoSpace.length >= 3 &&
                    normalizedKeyNoSpace.includes(normalizedNameNoSpace)) ||
                  (normalizedKeyNoSpace.length >= 3 &&
                    normalizedNameNoSpace.includes(normalizedKeyNoSpace))
                ) {
                  menuCd = value;
                  break;
                }
              }
            }

            if (menuCd) {
              menuId = menuCd;
              detailUrl = `https://www.burgerking.co.kr/menu/detail/${menuCd}`;
            } else if (menuId) {
              // cardMenuId가 있으면 사용
              detailUrl = `https://www.burgerking.co.kr/menu/detail/${menuId}`;
            }

            // 타겟 메뉴 중 하나인지 확인
            const matchedTargetMenu = normalizedTargetMenus.get(normalizedName);

            if (!matchedTargetMenu) {
              // 부분 일치 검색
              for (const [
                normalizedTarget,
                targetMenu,
              ] of normalizedTargetMenus.entries()) {
                const normalizedNameNoSpace = normalizedName.replace(
                  /\s+/g,
                  '',
                );
                const normalizedTargetNoSpace = normalizedTarget.replace(
                  /\s+/g,
                  '',
                );

                if (
                  normalizedName.includes(normalizedTarget) ||
                  normalizedTarget.includes(normalizedName) ||
                  normalizedNameNoSpace.includes(normalizedTargetNoSpace) ||
                  normalizedTargetNoSpace.includes(normalizedNameNoSpace)
                ) {
                  // 이미 저장된 메뉴가 없거나 이미지가 없는 경우에만 저장
                  const existing = menuDataMap.get(
                    this.normalizeMenuName(targetMenu),
                  );
                  if (!existing || !existing.imageUrl) {
                    menuDataMap.set(this.normalizeMenuName(targetMenu), {
                      originalName: targetMenu,
                      imageUrl: imageUrl,
                      detailUrl: detailUrl,
                      menuId: menuId || undefined,
                    });
                    console.log(
                      `  ✅ 발견: "${targetMenu}" (원본: "${menuName}") -> 이미지: ${imageUrl.substring(0, 60)}...${detailUrl ? ` -> URL: ${detailUrl}` : ''}`,
                    );
                  }
                  break;
                }
              }
            } else {
              // 정확히 일치하는 경우
              const existing = menuDataMap.get(normalizedName);
              if (!existing || !existing.imageUrl) {
                menuDataMap.set(normalizedName, {
                  originalName: matchedTargetMenu,
                  imageUrl: imageUrl,
                  detailUrl: detailUrl,
                  menuId: menuId || undefined,
                });
                console.log(
                  `  ✅ 발견: "${matchedTargetMenu}" (원본: "${menuName}") -> 이미지: ${imageUrl.substring(0, 60)}...${detailUrl ? ` -> URL: ${detailUrl}` : ''}`,
                );
              }
            }
          } catch (error) {
            // 개별 메뉴 카드 처리 중 에러 발생 시 계속 진행
            console.log(
              `    ⚠️ 메뉴 카드 처리 중 에러: ${error instanceof Error ? error.message : String(error)}`,
            );
            continue;
          }
        }

        await page.close();
      } finally {
        await browser.close();
      }

      console.log(
        `\n📊 메인 페이지에서 ${menuDataMap.size}개의 타겟 메뉴를 찾았습니다.`,
      );
    } catch (error: unknown) {
      errors++;
      const errorMsg = `메인 페이지 처리 실패: ${error instanceof Error ? error.message : String(error)}`;
      errorDetails.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }

    // 메뉴 상세 페이지 URL이 없는 경우 JSON 파일에서 menuCd 찾기
    const menusWithoutUrl = Array.from(menuDataMap.entries()).filter(
      ([, data]) => !data.detailUrl,
    );

    if (menusWithoutUrl.length > 0) {
      console.log(
        `\n🔍 ${menusWithoutUrl.length}개의 메뉴에 대해 상세 페이지 URL을 찾는 중...`,
      );

      // JSON 파일에서 menuCd 찾기
      for (const [normalizedName, menuData] of menusWithoutUrl) {
        const menuName = menuData.originalName;
        const menuCd =
          menuCdMap.get(normalizedName) ||
          menuCdMap.get(menuName.toLowerCase().trim()) ||
          menuCdMap.get(menuName.replace(/\s+/g, '').toLowerCase()) ||
          menuCdMap.get(this.normalizeMenuName(menuName).replace(/\s+/g, ''));

        if (menuCd) {
          menuData.detailUrl = `https://www.burgerking.co.kr/menu/detail/${menuCd}`;
          menuData.menuId = menuCd;
          console.log(`    ✅ "${menuName}" -> ${menuData.detailUrl}`);
        } else {
          console.log(
            `    ⚠️ "${menuName}" 상세 페이지 URL을 찾을 수 없음 (JSON에서 menuCd 없음)`,
          );
        }
      }

      // 여전히 URL이 없는 메뉴들에 대해서만 Puppeteer로 찾기
      const stillWithoutUrl = Array.from(menuDataMap.entries()).filter(
        ([, data]) => !data.detailUrl,
      );

      if (stillWithoutUrl.length > 0) {
        console.log(
          `\n🔍 ${stillWithoutUrl.length}개의 메뉴에 대해 Puppeteer로 상세 페이지 URL을 찾는 중...`,
        );

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

            await page.goto('https://www.burgerking.co.kr/menu/main', {
              waitUntil: 'networkidle2',
              timeout: 30000,
            });

            await this.delay(3000); // Vue 앱 로드 대기

            // 모든 메뉴 카드에서 메뉴 이름과 URL 매핑 추출
            const menuUrlMap: Record<string, string> = {};

            // 페이지의 모든 메뉴 카드 찾기
            const allCards = await page.$$('.menu_card');
            console.log(`    📋 총 ${allCards.length}개의 메뉴 카드 발견`);

            for (let i = 0; i < allCards.length; i++) {
              try {
                const card = allCards[i];

                // 메뉴 이름 추출
                const menuName = await page.evaluate((el) => {
                  const titleSpan = el.querySelector('.cont .tit span');
                  return titleSpan?.textContent?.trim() || '';
                }, card);

                if (!menuName || this.isSetOrCombo(menuName)) {
                  continue;
                }

                // 타겟 메뉴인지 확인 (정규화하여 비교)
                const normalizedCardName = this.normalizeMenuName(menuName);
                let isTargetMenu = false;
                let matchedTargetMenu = '';

                for (const [normalizedName, menuData] of stillWithoutUrl) {
                  if (normalizedName === normalizedCardName) {
                    isTargetMenu = true;
                    matchedTargetMenu = menuData.originalName;
                    break;
                  }
                }

                // 타겟 메뉴가 아니거나 이미 URL을 찾은 메뉴는 스킵
                if (!isTargetMenu || menuUrlMap[matchedTargetMenu]) {
                  continue;
                }

                console.log(
                  `    🔍 "${matchedTargetMenu}" (원본: "${menuName}") 상세 페이지 URL 찾는 중...`,
                );

                // 현재 URL 저장
                const currentUrl = page.url();

                // 메뉴 카드의 버튼 클릭
                const btn = await card.$('.btn_detail');
                if (btn) {
                  // 버튼 클릭
                  await btn.click();

                  // URL 변경 대기 (최대 3초)
                  let newUrl = currentUrl;
                  for (let attempt = 0; attempt < 15; attempt++) {
                    await this.delay(200);
                    newUrl = page.url();
                    if (
                      newUrl !== currentUrl &&
                      newUrl.includes('/menu/detail/')
                    ) {
                      break;
                    }
                  }

                  if (
                    newUrl !== currentUrl &&
                    newUrl.includes('/menu/detail/')
                  ) {
                    menuUrlMap[matchedTargetMenu] = newUrl;
                    console.log(`    ✅ "${matchedTargetMenu}" -> ${newUrl}`);

                    // 메인 페이지로 돌아가기
                    await page.goto('https://www.burgerking.co.kr/menu/main', {
                      waitUntil: 'networkidle2',
                      timeout: 30000,
                    });
                    await this.delay(2000);
                  } else {
                    // URL이 변경되지 않았으면 메인 페이지로 돌아가기
                    if (
                      page.url() !== 'https://www.burgerking.co.kr/menu/main'
                    ) {
                      await page.goto(
                        'https://www.burgerking.co.kr/menu/main',
                        {
                          waitUntil: 'networkidle2',
                          timeout: 30000,
                        },
                      );
                      await this.delay(2000);
                    }
                  }
                }
              } catch {
                // 에러 발생 시 메인 페이지로 돌아가기
                if (page.url() !== 'https://www.burgerking.co.kr/menu/main') {
                  await page
                    .goto('https://www.burgerking.co.kr/menu/main', {
                      waitUntil: 'networkidle2',
                      timeout: 30000,
                    })
                    .catch(() => {});
                  await this.delay(2000);
                }
                continue;
              }
            }

            // 추출한 URL 매핑을 menuDataMap에 적용
            for (const [normalizedName, menuData] of stillWithoutUrl) {
              const menuName = menuData.originalName;

              // 정확히 일치하는 메뉴 이름 찾기
              let foundUrl = menuUrlMap[menuName];

              // 정확히 일치하지 않으면 부분 일치 검색
              if (!foundUrl) {
                for (const [cardMenuName, url] of Object.entries(menuUrlMap)) {
                  const normalizedCardName =
                    this.normalizeMenuName(cardMenuName);
                  const normalizedTarget = this.normalizeMenuName(menuName);

                  if (
                    normalizedCardName === normalizedTarget ||
                    normalizedCardName.includes(normalizedTarget) ||
                    normalizedTarget.includes(normalizedCardName)
                  ) {
                    foundUrl = url;
                    break;
                  }
                }
              }

              if (foundUrl) {
                menuData.detailUrl = foundUrl;
                const menuId = foundUrl.match(/\/menu\/detail\/(\d+)/)?.[1];
                if (menuId) {
                  menuData.menuId = menuId;
                }
                console.log(
                  `    ✅ "${menuName}" 상세 페이지 URL 발견: ${foundUrl}`,
                );
              } else {
                console.log(
                  `    ⚠️ "${menuName}" 상세 페이지 URL을 찾을 수 없음`,
                );
              }
            }

            await page.close();
          } finally {
            await browser.close();
          }
        } catch (error: unknown) {
          console.log(
            `  ⚠️ Puppeteer로 상세 페이지 URL 찾기 실패: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // description 추출 함수 (Puppeteer 사용 - Vue.js SPA이므로)
    const extractDescription = async (
      detailUrl: string,
    ): Promise<string | null> => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        await page.goto(detailUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        // Vue 앱 로드 대기
        await this.delay(2000);

        // description 추출: class="description"인 div 안의 span 텍스트
        const description = await page.evaluate(() => {
          // 방법 1: div.description span
          const descriptionEl = document.querySelector('div.description span');
          if (descriptionEl) {
            return descriptionEl.textContent?.trim() || null;
          }

          // 방법 2: div.description 직접 텍스트
          const altDescriptionEl = document.querySelector('div.description');
          if (altDescriptionEl) {
            return altDescriptionEl.textContent?.trim() || null;
          }

          return null;
        });

        await page.close();
        return description;
      } catch (error: unknown) {
        console.error(
          `  ⚠️ description 추출 실패 (${detailUrl}): ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      } finally {
        await browser.close();
      }
    };

    // 각 타겟 메뉴에 대해 DB 저장/업데이트
    const savedMenuItems = new Map<string, MenuItem>();

    for (const targetMenu of targetMenus) {
      try {
        const normalizedTarget = this.normalizeMenuName(targetMenu);
        const menuData = menuDataMap.get(normalizedTarget);

        if (!menuData) {
          console.log(`  ⚠️ 스크래핑 데이터 없음: ${targetMenu}`);
          errors++;
          errorDetails.push(`${targetMenu}: 메인 페이지에서 찾을 수 없음`);
          continue;
        }

        // description 추출 (detailUrl이 있는 경우)
        let description: string | null = null;
        if (menuData.detailUrl) {
          console.log(`  📝 description 추출 중: ${menuData.detailUrl}`);
          description = await extractDescription(menuData.detailUrl);
          if (description) {
            console.log(
              `  ✅ description 추출 성공: ${description.substring(0, 50)}...`,
            );
          } else {
            console.log(`  ⚠️ description 추출 실패`);
          }
        }

        // DB에서 기존 메뉴 확인
        let menuItem = await this.menuItemsRepository.findOne({
          where: {
            brandId: brand.id,
            name: targetMenu,
            category: 'burger',
          },
        });

        if (menuItem) {
          // 업데이트
          if (menuData.imageUrl) {
            menuItem.imageUrl = menuData.imageUrl;
          }
          if (menuData.detailUrl) {
            menuItem.detailUrl = menuData.detailUrl;
          }
          if (description) {
            menuItem.description = description;
          }
          menuItem.isActive = true;
          await this.menuItemsRepository.save(menuItem);
          updated++;
          console.log(`  ✅ 업데이트: ${targetMenu}`);
          savedMenuItems.set(targetMenu, menuItem);
        } else {
          // 생성
          menuItem = this.menuItemsRepository.create({
            brandId: brand.id,
            name: targetMenu,
            category: 'burger',
            imageUrl: menuData.imageUrl,
            detailUrl: menuData.detailUrl || undefined,
            description: description || undefined,
            isActive: true,
          });

          const savedMenuItem = await this.menuItemsRepository.save(menuItem);
          created++;
          console.log(`  ✅ 생성: ${targetMenu}`);
          savedMenuItems.set(targetMenu, savedMenuItem);
        }
      } catch (error: unknown) {
        errors++;
        const errorMsg = `${targetMenu}: ${error instanceof Error ? error.message : String(error)}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ 에러: ${errorMsg}`);
      }
    }

    console.log(
      `\n📊 메뉴 처리 완료: ${created}개 생성, ${updated}개 업데이트, ${errors}개 실패`,
    );

    const deactivated = await this.deactivateStaleMenuItems(
      brand.id,
      Array.from(savedMenuItems.keys()),
    );
    if (deactivated > 0) {
      console.log(`  🗄️ 현재 홈페이지에 없는 메뉴 ${deactivated}개 비활성화`);
    }

    // 영양성분 스크래핑
    console.log(`\n🥗 영양성분 데이터 수집 시작...`);
    const nutritionResult = await this.scrapeNutritionData(
      brand.id,
      savedMenuItems,
    );

    // IngestLog 생성
    await this.createIngestLog({
      brandId: brand.id,
      status:
        errors === 0 && nutritionResult.errors === 0
          ? 'success'
          : 'partial_success',
      changedCount: created + updated + nutritionResult.saved + deactivated,
      error:
        errors > 0 || nutritionResult.errors > 0
          ? `${errorDetails.join('; ')}; ${nutritionResult.errorDetails.join('; ')}`
          : undefined,
    });

    return {
      success: errors === 0 && nutritionResult.errors === 0,
      brand: brand.name,
      total: menuDataMap.size,
      created,
      updated,
      errors: errors + nutritionResult.errors,
      errorDetails: [...errorDetails, ...nutritionResult.errorDetails].slice(
        0,
        10,
      ),
    };
  }

  /**
   * 버거킹 메뉴 상세 페이지에서 영양성분 데이터를 추출하여 저장
   */
  private async scrapeNutritionData(
    brandId: string,
    menuItemsMap: Map<string, MenuItem>,
  ): Promise<{
    saved: number;
    errors: number;
    errorDetails: string[];
  }> {
    let saved = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // 각 메뉴의 상세 페이지에서 영양성분 추출
    for (const [menuName, menuItem] of menuItemsMap.entries()) {
      try {
        if (!menuItem.detailUrl) {
          console.log(`  ⚠️ 상세 페이지 URL 없음: ${menuName}`);
          continue;
        }

        await this.delay(1000); // 서버 부하 방지

        console.log(
          `\n  📄 영양성분 추출 중: ${menuName} (${menuItem.detailUrl})`,
        );

        // Puppeteer로 상세 페이지 접속 및 모달 열기
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
          const page = await browser.newPage();
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          );

          await page.goto(menuItem.detailUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

          // Vue 앱 로드 대기
          await page
            .waitForSelector('.btn_info_link', { timeout: 10000 })
            .catch(() => {
              console.log(`    ⚠️ 영양성분 버튼을 찾을 수 없음`);
            });

          await this.delay(2000);

          // 영양성분 버튼 찾기 및 클릭
          let modalOpened = false;

          // 방법 1: .btn_info_link 클래스로 찾기
          try {
            await page.waitForSelector('.btn_info_link', { timeout: 5000 });
            const infoButtons = await page.$$('.btn_info_link');

            for (const btn of infoButtons) {
              const btnText = await page.evaluate((el) => {
                const span = el.querySelector('span');
                return (
                  span?.textContent?.trim() || el.textContent?.trim() || ''
                );
              }, btn);

              if (
                btnText.includes('원산지') ||
                btnText.includes('영양성분') ||
                btnText.includes('알레르기')
              ) {
                await page.evaluate((el) => {
                  (el as HTMLElement).click();
                }, btn);
                await this.delay(2000);
                modalOpened = true;
                console.log(`    ✅ 영양성분 버튼 클릭 성공: "${btnText}"`);
                break;
              }
            }
          } catch {
            // .btn_info_link를 찾을 수 없으면 다른 방법 시도
          }

          // 방법 2: 모든 버튼에서 찾기
          if (!modalOpened) {
            const modalOpenedResult = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              for (const btn of buttons) {
                const span = btn.querySelector('span');
                const text =
                  span?.textContent?.trim() || btn.textContent?.trim() || '';
                if (
                  text.includes('원산지') ||
                  text.includes('영양성분') ||
                  text.includes('알레르기')
                ) {
                  (btn as HTMLElement).click();
                  return true;
                }
              }
              return false;
            });
            if (modalOpenedResult) {
              await this.delay(2000);
              modalOpened = true;
            }
          }

          if (!modalOpened) {
            console.log(`    ⚠️ 영양성분 버튼 클릭 실패`);
            await browser.close();
            continue;
          }

          await this.delay(2000);

          // 모달에서 영양성분 테이블 추출
          const nutritionResult = await page.evaluate((targetMenuName) => {
            const modals = document.querySelectorAll('.modalWrap');
            let nutritionTable: HTMLTableElement | null = null;

            for (const modal of modals) {
              const style = window.getComputedStyle(modal);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                const contBoxes = modal.querySelectorAll('.cont_box02');
                for (const box of contBoxes) {
                  const h2 = box.querySelector('h2.tit01');
                  if (
                    h2 &&
                    h2.textContent &&
                    h2.textContent.includes('영양성분')
                  ) {
                    const table = box.querySelector('table.info_table');
                    if (table) {
                      nutritionTable = table as HTMLTableElement;
                      break;
                    }
                  }
                }
                if (nutritionTable) break;
              }
            }

            if (!nutritionTable) {
              return {
                data: null,
                debug: { error: '영양성분 테이블을 찾을 수 없음' },
              };
            }

            // 헤더에서 컬럼 인덱스 찾기
            // 주의: <th>는 "제품명", "중량", "열량", "단백질" 순서이고
            // <td>는 "중량", "열량", "단백질" 순서이므로 th 인덱스에서 1을 빼야 함
            const headerMap: { [key: string]: number } = {};
            const headerRow = nutritionTable.querySelector('thead tr');
            if (headerRow) {
              const headers = headerRow.querySelectorAll('th');
              headers.forEach((th, i) => {
                const headerText = th.textContent?.trim() || '';
                // "제품명"은 th[0]이므로 데이터 셀 인덱스는 i-1
                const dataCellIndex = i - 1;
                if (
                  headerText.includes('열량') ||
                  headerText.includes('Kcal')
                ) {
                  headerMap['kcal'] = dataCellIndex;
                } else if (headerText.includes('단백질')) {
                  headerMap['protein'] = dataCellIndex;
                } else if (headerText.includes('나트륨')) {
                  headerMap['sodium'] = dataCellIndex;
                } else if (headerText.includes('당류')) {
                  headerMap['sugar'] = dataCellIndex;
                } else if (headerText.includes('포화지방')) {
                  headerMap['saturatedFat'] = dataCellIndex;
                }
              });
            }

            // 메뉴 이름과 일치하는 행 찾기 (단품 버거만)
            const tbody = nutritionTable.querySelector('tbody');
            if (!tbody) {
              return {
                data: null,
                debug: { error: '테이블 tbody를 찾을 수 없음' },
              };
            }

            const rows = tbody.querySelectorAll('tr');

            // 제외할 키워드 (세트, 팩 등)
            const excludeKeywords = [
              '세트',
              '팩',
              '세트팩',
              '콤보',
              'combo',
              'set',
              'pack',
              '라지',
              'large',
              '프렌치프라이',
              '프라이',
              '코카콜라',
              '콜라',
              '사이드',
              '음료',
            ];

            // 정규화 함수 (normalizeMenuName과 동일한 로직)
            const normalizeName = (name: string): string => {
              return name
                .replace(/행\)/g, '')
                .replace(/세트/g, '')
                .replace(/라지/g, '')
                .replace(/\(R\)/g, '')
                .replace(/\(L\)/g, '')
                .replace(/\+/g, '')
                .replace(/X2/g, '')
                .replace(/콜라R/g, '')
                .replace(/콜라L/g, '')
                .replace(/프라이R/g, '')
                .replace(/프라이L/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
            };

            // 정규화된 메뉴 이름 준비
            const normalizedMenuName = normalizeName(targetMenuName);
            const menuNameNoSpace = normalizedMenuName.replace(/\s+/g, '');

            // 모든 제품명 수집 (디버깅용)
            const allProductNames: string[] = [];
            const allRowsInfo: Array<{
              name: string;
              isExcluded: boolean;
              reason?: string;
            }> = [];
            let bestMatch: {
              row: Element;
              score: number;
              productName: string;
            } | null = null;

            for (const row of rows) {
              // 메뉴 이름은 <th scope="row">에 있음
              const menuTh = row.querySelector('th[scope="row"]');
              if (!menuTh) {
                // th가 없으면 다른 방법으로 제품명 찾기 시도
                const firstCell = row.querySelector(
                  'td:first-child, th:first-child',
                );
                if (!firstCell) continue;
                const productName = firstCell.textContent?.trim() || '';
                if (productName) {
                  allRowsInfo.push({
                    name: productName,
                    isExcluded: true,
                    reason: 'th[scope="row"] 없음',
                  });
                }
                continue;
              }

              const productName = menuTh.textContent?.trim() || '';
              const cells = row.querySelectorAll('td');

              if (cells.length === 0) {
                allRowsInfo.push({
                  name: productName,
                  isExcluded: true,
                  reason: '데이터 셀 없음',
                });
                continue;
              }

              // 세트, 팩 등이 포함된 행은 제외
              const productNameLower = productName.toLowerCase();
              const hasExcludeKeyword = excludeKeywords.some((keyword) =>
                productNameLower.includes(keyword.toLowerCase()),
              );

              // "+" 기호가 있으면 세트/콤보
              const hasPlus =
                productName.includes('+') || productName.includes('＋');

              // "행)"으로 시작하면 세트
              const startsWithSet = productName.startsWith('행)');

              if (hasExcludeKeyword || hasPlus || startsWithSet) {
                const reason = hasExcludeKeyword
                  ? '제외 키워드 포함'
                  : hasPlus
                    ? '플러스 기호 포함'
                    : '행)으로 시작';
                allRowsInfo.push({
                  name: productName,
                  isExcluded: true,
                  reason,
                });
                continue; // 세트/팩 메뉴는 건너뛰기
              }

              // 단품으로 판단
              allProductNames.push(productName);
              allRowsInfo.push({ name: productName, isExcluded: false });

              // 메뉴 이름 매칭 - 정규화된 이름으로 비교
              const normalizedProductName = normalizeName(productName);
              const productNameNoSpace = normalizedProductName.replace(
                /\s+/g,
                '',
              );

              let matchScore = 0;

              // 1. 정확한 매칭 (가장 높은 우선순위)
              if (normalizedProductName === normalizedMenuName) {
                matchScore = 100;
              } else if (productNameNoSpace === menuNameNoSpace) {
                matchScore = 95;
              } else if (productName === targetMenuName) {
                matchScore = 90;
              }
              // 2. 제품명이 메뉴명으로 시작하는 경우
              else if (
                normalizedProductName.startsWith(normalizedMenuName) &&
                normalizedMenuName.length >= 3
              ) {
                matchScore = 80;
              } else if (
                productNameNoSpace.startsWith(menuNameNoSpace) &&
                menuNameNoSpace.length >= 3
              ) {
                matchScore = 75;
              }
              // 3. 메뉴명이 제품명으로 시작하는 경우 (단품 버거인 경우)
              else if (
                normalizedMenuName.startsWith(normalizedProductName) &&
                normalizedProductName.length >= 3
              ) {
                matchScore = 70;
              } else if (
                menuNameNoSpace.startsWith(productNameNoSpace) &&
                productNameNoSpace.length >= 3
              ) {
                matchScore = 65;
              }
              // 4. 양방향 포함 관계 (단품 버거인 경우만, 최소 3글자 이상)
              else if (
                normalizedProductName.includes(normalizedMenuName) &&
                normalizedMenuName.length >= 3
              ) {
                matchScore = 60;
              } else if (
                normalizedMenuName.includes(normalizedProductName) &&
                normalizedProductName.length >= 3
              ) {
                matchScore = 55;
              }
              // 5. 부분 일치 (더 관대한 매칭)
              else {
                // 공통 부분 문자열 찾기
                const commonLength = Math.min(
                  normalizedProductName.length,
                  normalizedMenuName.length,
                );
                let commonChars = 0;
                for (let i = 0; i < commonLength; i++) {
                  if (normalizedProductName[i] === normalizedMenuName[i]) {
                    commonChars++;
                  } else {
                    break;
                  }
                }
                // 공통 부분이 전체의 50% 이상이면 매칭
                if (
                  commonChars >= Math.max(3, normalizedMenuName.length * 0.5)
                ) {
                  matchScore = 50;
                }
              }

              if (matchScore > 0) {
                if (!bestMatch || matchScore > bestMatch.score) {
                  bestMatch = { row, score: matchScore, productName };
                }
              }
            }

            // 디버그 정보 준비
            const debugInfo: any = {
              targetMenuName,
              normalizedMenuName,
              allProductNames,
              allRowsInfo: allRowsInfo.slice(0, 20), // 최대 20개만 표시
              totalRows: rows.length,
            };

            if (bestMatch && bestMatch.score >= 50) {
              debugInfo.matchedProductName = bestMatch.productName;
              debugInfo.matchScore = bestMatch.score;

              const row = bestMatch.row;
              const cells = row.querySelectorAll('td');

              const parseNumber = (text: string): number | null => {
                // 괄호와 그 안의 내용 제거 (예: "43(78)" -> "43")
                let cleaned = text.replace(/\([^)]*\)/g, '').trim();
                // 단위 제거 (g, mg, ml, kcal, % 등)
                cleaned = cleaned.replace(/[a-zA-Z%]/g, '').trim();
                // 공백, 쉼표 제거
                cleaned = cleaned.replace(/[,\s]/g, '').trim();
                if (!cleaned || cleaned === '-' || cleaned === '') {
                  return null;
                }
                const num = parseFloat(cleaned);
                return isNaN(num) ? null : num;
              };

              const result: any = {};

              // 컬럼 순서: 제품명(th), 중량(g/ml), 열량(kcal), 단백질(g), 나트륨(mg), 당류(g), 포화지방(g), 카페인(mg)
              // td cells[0] = 중량, cells[1] = 열량, cells[2] = 단백질, cells[3] = 나트륨, cells[4] = 당류, cells[5] = 포화지방, cells[6] = 카페인
              // 헤더 맵은 이미 dataCellIndex로 계산되어 있음 (th 인덱스 - 1)

              // 헤더 맵이 비어있으면 기본 인덱스 사용
              // 열량 (cells[1])
              const kcalIndex =
                headerMap['kcal'] !== undefined && headerMap['kcal'] >= 0
                  ? headerMap['kcal']
                  : 1;
              if (cells.length > kcalIndex && kcalIndex >= 0) {
                const valueText = cells[kcalIndex].textContent?.trim() || '';
                const kcalValue = parseNumber(valueText);
                if (kcalValue !== null) {
                  result.kcal = kcalValue;
                }
              }

              // 단백질 (cells[2])
              const proteinIndex =
                headerMap['protein'] !== undefined && headerMap['protein'] >= 0
                  ? headerMap['protein']
                  : 2;
              if (cells.length > proteinIndex && proteinIndex >= 0) {
                const valueText = cells[proteinIndex].textContent?.trim() || '';
                const proteinValue = parseNumber(valueText);
                if (proteinValue !== null) {
                  result.protein = proteinValue;
                }
              }

              // 나트륨 (cells[3])
              const sodiumIndex =
                headerMap['sodium'] !== undefined && headerMap['sodium'] >= 0
                  ? headerMap['sodium']
                  : 3;
              if (cells.length > sodiumIndex && sodiumIndex >= 0) {
                const valueText = cells[sodiumIndex].textContent?.trim() || '';
                const sodiumValue = parseNumber(valueText);
                if (sodiumValue !== null) {
                  result.sodium = sodiumValue;
                }
              }

              // 당류 (cells[4])
              const sugarIndex =
                headerMap['sugar'] !== undefined && headerMap['sugar'] >= 0
                  ? headerMap['sugar']
                  : 4;
              if (cells.length > sugarIndex && sugarIndex >= 0) {
                const valueText = cells[sugarIndex].textContent?.trim() || '';
                const sugarValue = parseNumber(valueText);
                if (sugarValue !== null) {
                  result.sugar = sugarValue;
                }
              }

              // 포화지방 (cells[5])
              const saturatedFatIndex =
                headerMap['saturatedFat'] !== undefined &&
                headerMap['saturatedFat'] >= 0
                  ? headerMap['saturatedFat']
                  : 5;
              if (cells.length > saturatedFatIndex && saturatedFatIndex >= 0) {
                const valueText =
                  cells[saturatedFatIndex].textContent?.trim() || '';
                const saturatedFatValue = parseNumber(valueText);
                if (saturatedFatValue !== null) {
                  result.saturatedFat = saturatedFatValue;
                }
              }

              return { data: result, debug: debugInfo };
            }

            debugInfo.error = '매칭되는 제품을 찾을 수 없음';
            return { data: null, debug: debugInfo };
          }, menuName);

          // 디버그 정보 출력
          if (nutritionResult.debug) {
            if (nutritionResult.debug.matchedProductName) {
              console.log(
                `    🔍 매칭 성공: "${menuName}" -> "${nutritionResult.debug.matchedProductName}" (점수: ${nutritionResult.debug.matchScore})`,
              );
            } else {
              console.log(`    ⚠️ 매칭 실패: "${menuName}"`);
              console.log(
                `       정규화된 메뉴명: "${nutritionResult.debug.normalizedMenuName}"`,
              );
              console.log(
                `       테이블 총 행 수: ${nutritionResult.debug.totalRows || 0}`,
              );
              if (
                nutritionResult.debug.allProductNames &&
                nutritionResult.debug.allProductNames.length > 0
              ) {
                console.log(
                  `       테이블의 단품 제품명 (${nutritionResult.debug.allProductNames.length}개):`,
                  nutritionResult.debug.allProductNames,
                );
              } else {
                console.log(`       테이블의 단품 제품명: 없음`);
              }
              if (
                nutritionResult.debug.allRowsInfo &&
                nutritionResult.debug.allRowsInfo.length > 0
              ) {
                console.log(`       테이블의 모든 행 정보 (최대 10개):`);
                nutritionResult.debug.allRowsInfo
                  .slice(0, 10)
                  .forEach((rowInfo: any) => {
                    console.log(
                      `         - "${rowInfo.name}" ${rowInfo.isExcluded ? `(제외: ${rowInfo.reason})` : '(단품)'}`,
                    );
                  });
              }
              if (nutritionResult.debug.error) {
                console.log(`       오류: ${nutritionResult.debug.error}`);
              }
            }
          }

          const nutritionData = nutritionResult.data;

          await browser.close();

          if (
            nutritionData &&
            (nutritionData.kcal ||
              nutritionData.protein ||
              nutritionData.sodium)
          ) {
            // 기존 영양성분 데이터 확인
            let nutrition = await this.nutritionRepository.findOne({
              where: { menuItemId: menuItem.id },
            });

            if (nutrition) {
              // 업데이트
              if (
                nutritionData.kcal !== null &&
                nutritionData.kcal !== undefined
              ) {
                nutrition.kcal = nutritionData.kcal as number;
              }
              if (
                nutritionData.protein !== null &&
                nutritionData.protein !== undefined
              ) {
                nutrition.protein = nutritionData.protein as number;
              }
              if (
                nutritionData.sodium !== null &&
                nutritionData.sodium !== undefined
              ) {
                nutrition.sodium = nutritionData.sodium as number;
              }
              if (
                nutritionData.sugar !== null &&
                nutritionData.sugar !== undefined
              ) {
                nutrition.sugar = nutritionData.sugar as number;
              }
              if (
                nutritionData.saturatedFat !== null &&
                nutritionData.saturatedFat !== undefined
              ) {
                nutrition.saturatedFat = nutritionData.saturatedFat as number;
              }
              await this.nutritionRepository.save(nutrition);
              saved++;
              console.log(
                `    ✅ 영양성분 업데이트: ${menuName} (칼로리: ${nutritionData.kcal ?? 'N/A'}kcal)`,
              );
            } else {
              // 생성
              nutrition = this.nutritionRepository.create({
                menuItemId: menuItem.id,
                kcal: nutritionData.kcal as number | undefined,
                protein: nutritionData.protein as number | undefined,
                sodium: nutritionData.sodium as number | undefined,
                sugar: nutritionData.sugar as number | undefined,
                saturatedFat: nutritionData.saturatedFat as number | undefined,
              } as Nutrition);
              await this.nutritionRepository.save(nutrition);
              saved++;
              console.log(
                `    ✅ 영양성분 생성: ${menuName} (칼로리: ${nutritionData.kcal ?? 'N/A'}kcal)`,
              );
            }
          } else {
            console.log(`    ⚠️ 영양성분 데이터 없음: ${menuName}`);
          }
        } catch (error: unknown) {
          await browser.close().catch(() => {});
          throw error;
        }
      } catch (error: unknown) {
        errors++;
        const errorMsg = `${menuName} 영양성분 처리 실패: ${error instanceof Error ? error.message : String(error)}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log(`\n📊 영양성분 처리 완료: ${saved}개 저장, ${errors}개 실패`);

    return { saved, errors, errorDetails };
  }
}
