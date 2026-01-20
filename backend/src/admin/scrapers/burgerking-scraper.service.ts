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

    console.log(`📋 총 ${targetMenus.length}개의 타겟 메뉴를 처리합니다.`);

    // 메인 페이지에서 메뉴 정보 추출
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

      const mainPageResponse = await axios.get(mainPageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      const $ = cheerio.load(String(mainPageResponse.data));

      // 메뉴 카드 찾기
      $('.menu_card').each((_, element) => {
        const $card = $(element);
        const $img = $card.find('.prd_image img');
        const $title = $card.find('.cont .tit span');
        const $detailBtn = $card.find('.btn_detail');

        if (!$img.length || !$title.length) {
          return;
        }

        const imageUrl = $img.attr('src')?.trim();
        const menuName = $title.text().trim();

        if (!imageUrl || !menuName) {
          return;
        }

        // 세트/콤보 메뉴는 제외
        if (this.isSetOrCombo(menuName)) {
          return;
        }

        // 이미지 URL을 절대 경로로 변환
        let fullImageUrl = imageUrl;
        if (!fullImageUrl.startsWith('http')) {
          if (fullImageUrl.startsWith('//')) {
            fullImageUrl = `https:${fullImageUrl}`;
          } else if (fullImageUrl.startsWith('/')) {
            fullImageUrl = `https://www.burgerking.co.kr${fullImageUrl}`;
          } else {
            return;
          }
        }

        // 상세 페이지 URL 추출
        // 버거킹은 Vue.js를 사용하므로 실제 링크가 없을 수 있음
        // 메뉴 카드의 data 속성이나 주변 요소에서 메뉴 ID를 찾아야 함
        const normalizedName = this.normalizeMenuName(menuName);

        // 메뉴 카드에서 data 속성이나 다른 속성으로 메뉴 ID 찾기
        let menuId: string | null = null;
        let detailUrl = '';

        // 방법 1: data 속성에서 찾기
        menuId =
          $card.attr('data-menu-id') ||
          $card.attr('data-id') ||
          $detailBtn.attr('data-menu-id') ||
          $detailBtn.attr('data-id') ||
          null;

        // 방법 2: 주변 요소에서 메뉴 ID 찾기 (Vue 컴포넌트의 data 속성 등)
        if (!menuId) {
          // 메뉴 카드의 부모 요소나 형제 요소에서 찾기
          const parent = $card.parent();
          menuId =
            parent.attr('data-menu-id') || parent.attr('data-id') || null;
        }

        if (menuId) {
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
            const normalizedNameNoSpace = normalizedName.replace(/\s+/g, '');
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
                  imageUrl: fullImageUrl,
                  detailUrl: detailUrl,
                  menuId: menuId || undefined,
                });
                console.log(
                  `  ✅ 발견: "${targetMenu}" (원본: "${menuName}") -> 이미지: ${fullImageUrl.substring(0, 60)}...`,
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
              imageUrl: fullImageUrl,
              detailUrl: detailUrl,
              menuId: menuId || undefined,
            });
            console.log(
              `  ✅ 발견: "${matchedTargetMenu}" (원본: "${menuName}") -> 이미지: ${fullImageUrl.substring(0, 60)}...`,
            );
          }
        }
      });

      console.log(
        `\n📊 메인 페이지에서 ${menuDataMap.size}개의 타겟 메뉴를 찾았습니다.`,
      );
    } catch (error: unknown) {
      errors++;
      const errorMsg = `메인 페이지 처리 실패: ${error instanceof Error ? error.message : String(error)}`;
      errorDetails.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }

    // 메뉴 상세 페이지 URL이 없는 경우 Puppeteer로 찾기
    // 버거킹은 Vue.js를 사용하므로 실제 링크가 없을 수 있음
    // Puppeteer로 메인 페이지를 로드하고 모든 메뉴 카드의 버튼을 클릭하여 URL 추출
    const menusWithoutUrl = Array.from(menuDataMap.entries()).filter(
      ([, data]) => !data.detailUrl,
    );

    if (menusWithoutUrl.length > 0) {
      console.log(`\n🔍 ${menusWithoutUrl.length}개의 메뉴에 대해 상세 페이지 URL을 찾는 중...`);
      
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

              for (const [normalizedName, menuData] of menusWithoutUrl) {
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
                  if (newUrl !== currentUrl && newUrl.includes('/menu/detail/')) {
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
                  if (page.url() !== 'https://www.burgerking.co.kr/menu/main') {
                    await page.goto('https://www.burgerking.co.kr/menu/main', {
                      waitUntil: 'networkidle2',
                      timeout: 30000,
                    });
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
          for (const [normalizedName, menuData] of menusWithoutUrl) {
            const menuName = menuData.originalName;
            
            // 정확히 일치하는 메뉴 이름 찾기
            let foundUrl = menuUrlMap[menuName];
            
            // 정확히 일치하지 않으면 부분 일치 검색
            if (!foundUrl) {
              for (const [cardMenuName, url] of Object.entries(menuUrlMap)) {
                const normalizedCardName = this.normalizeMenuName(cardMenuName);
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
      changedCount: created + updated + nutritionResult.saved,
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

        console.log(`\n  📄 영양성분 추출 중: ${menuName} (${menuItem.detailUrl})`);

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
                  span?.textContent?.trim() ||
                  el.textContent?.trim() ||
                  ''
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
          const nutritionData = await page.evaluate((targetMenuName) => {
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

            if (!nutritionTable) return null;

            // 헤더에서 컬럼 인덱스 찾기
            const headerMap: { [key: string]: number } = {};
            const headerRow = nutritionTable.querySelector('thead tr');
            if (headerRow) {
              const headers = headerRow.querySelectorAll('th');
              headers.forEach((th, i) => {
                const headerText = th.textContent?.trim() || '';
                if (
                  headerText.includes('열량') ||
                  headerText.includes('Kcal')
                ) {
                  headerMap['kcal'] = i;
                } else if (headerText.includes('단백질')) {
                  headerMap['protein'] = i;
                } else if (headerText.includes('나트륨')) {
                  headerMap['sodium'] = i;
                } else if (headerText.includes('당류')) {
                  headerMap['sugar'] = i;
                } else if (headerText.includes('포화지방')) {
                  headerMap['saturatedFat'] = i;
                }
              });
            }

            // 메뉴 이름과 일치하는 행 찾기
            const tbody = nutritionTable.querySelector('tbody');
            if (!tbody) return null;

            const rows = tbody.querySelectorAll('tr');
            for (const row of rows) {
              // 메뉴 이름은 <th scope="row">에 있음
              const menuTh = row.querySelector('th[scope="row"]');
              if (!menuTh) continue;

              const productName = menuTh.textContent?.trim() || '';
              const cells = row.querySelectorAll('td');

              if (cells.length === 0) continue;

              const normalizedProductName = productName
                .replace(/\s+/g, '')
                .toLowerCase();
              const normalizedMenuName = targetMenuName
                .replace(/\s+/g, '')
                .toLowerCase();

              if (
                normalizedProductName.includes(normalizedMenuName) ||
                normalizedMenuName.includes(normalizedProductName) ||
                productName === targetMenuName
              ) {
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
                // cells[0] = 중량, cells[1] = 열량, cells[2] = 단백질, cells[3] = 나트륨, cells[4] = 당류, cells[5] = 포화지방, cells[6] = 카페인

                // 헤더 맵을 사용하거나, 고정 인덱스 사용
                // 열량 (일반적으로 cells[1] 또는 headerMap['kcal'])
                const kcalIndex =
                  headerMap['kcal'] !== undefined ? headerMap['kcal'] : 1;
                if (cells.length > kcalIndex) {
                  const valueText = cells[kcalIndex].textContent?.trim() || '';
                  result.kcal = parseNumber(valueText);
                }

                // 단백질 (일반적으로 cells[2] 또는 headerMap['protein'])
                const proteinIndex =
                  headerMap['protein'] !== undefined
                    ? headerMap['protein']
                    : 2;
                if (cells.length > proteinIndex) {
                  const valueText = cells[proteinIndex].textContent?.trim() || '';
                  result.protein = parseNumber(valueText);
                }

                // 나트륨 (일반적으로 cells[3] 또는 headerMap['sodium'])
                const sodiumIndex =
                  headerMap['sodium'] !== undefined ? headerMap['sodium'] : 3;
                if (cells.length > sodiumIndex) {
                  const valueText = cells[sodiumIndex].textContent?.trim() || '';
                  result.sodium = parseNumber(valueText);
                }

                // 당류 (일반적으로 cells[4] 또는 headerMap['sugar'])
                const sugarIndex =
                  headerMap['sugar'] !== undefined ? headerMap['sugar'] : 4;
                if (cells.length > sugarIndex) {
                  const valueText = cells[sugarIndex].textContent?.trim() || '';
                  result.sugar = parseNumber(valueText);
                }

                // 포화지방 (일반적으로 cells[5] 또는 headerMap['saturatedFat'])
                const saturatedFatIndex =
                  headerMap['saturatedFat'] !== undefined
                    ? headerMap['saturatedFat']
                    : 5;
                if (cells.length > saturatedFatIndex) {
                  const valueText =
                    cells[saturatedFatIndex].textContent?.trim() || '';
                  result.saturatedFat = parseNumber(valueText);
                }

                return result;
              }
            }

            return null;
          }, menuName);

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
