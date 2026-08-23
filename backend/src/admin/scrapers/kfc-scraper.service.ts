import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestLog } from '../entities/ingest-log.entity';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';
import { Nutrition } from '../../nutrition/entities/nutrition.entity';
import { BrandsService } from '../../brands/brands.service';
import { BaseScraperService } from './base-scraper.service';
import axios from 'axios';
import * as puppeteer from 'puppeteer';

@Injectable()
export class KfcScraperService extends BaseScraperService {
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
    return name.replace(/\s+/g, '').trim().toLowerCase();
  }

  private normalizeKfcDisplayName(name: string): string {
    return name
      .replace(/_KEP_/g, '켚')
      .replace(/_CHIK_/g, '칰')
      .trim();
  }

  private toKfcImageUrl(imageUrl: string): string {
    if (!imageUrl) {
      return '';
    }
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    if (imageUrl.startsWith('/kfcs_api_img/')) {
      return `https://kfcapi.inicis.com${imageUrl}`;
    }
    if (imageUrl.startsWith('/')) {
      return `https://www.kfckorea.com${imageUrl}`;
    }
    return `https://www.kfckorea.com/${imageUrl}`;
  }

  private async fetchKfcDeliveryBurgerMenus(): Promise<
    Array<{
      name: string;
      imageUrl: string;
      detailUrl?: string;
      description?: string;
    }>
  > {
    const response = await axios.post(
      'https://www.kfckorea.com/kfc/interface/selectDeliveryList',
      new URLSearchParams({
        product_ordertype: 'D',
        delivery_subGroupCd: 'BEGR',
        merchantId: '',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Referer: 'https://www.kfckorea.com/delivery/burger',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000,
      },
    );

    const list = response.data?.kfcs?.data?.list;
    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .filter((item) => item?.menuNm && item?.menuImgUrl)
      .map((item) => {
        const menuCd = String(item.menuCd || '').trim();
        const merchantShortYn = String(item.merchantShortYn || 'N').trim();

        return {
          name: this.normalizeKfcDisplayName(String(item.menuNm)),
          imageUrl: this.toKfcImageUrl(String(item.menuImgUrl)),
          detailUrl: menuCd
            ? `https://www.kfckorea.com/delivery/detail/${merchantShortYn}/${menuCd}`
            : undefined,
          description: item.menuDesc
            ? this.normalizeKfcDisplayName(String(item.menuDesc))
            : undefined,
        };
      });
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

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // KFC 메뉴 목록 (사용자가 제공한 9개)
    const kfcMenus = [
      '칰폴레맵징거통다리',
      '칰폴레맵징거타워',
      '칰폴레맵징거더블다운',
      '징거더블다운통다리',
      '치즈징거통다리',
      '징거BLT',
      '징거타워',
      '칠리징거통다리',
      '클래식징거통다리',
      '징거',
      '트위스터',
      '더블커넬오리지널',
    ];

    console.log(`📋 총 ${kfcMenus.length}개의 메뉴를 처리합니다.`);

    // 메뉴 데이터 맵
    const menuDataMap = new Map<
      string,
      { imageUrl?: string; detailUrl?: string; description?: string }
    >();

    try {
      try {
        console.log(`\n🌐 KFC 공식 메뉴 API 호출 중...`);
        const apiMenuData = await this.fetchKfcDeliveryBurgerMenus();
        apiMenuData.forEach((menu) => {
          menuDataMap.set(menu.name, {
            imageUrl: menu.imageUrl,
            detailUrl: menu.detailUrl,
            description: menu.description,
          });
        });
        console.log(`  ✅ API에서 ${apiMenuData.length}개의 메뉴 정보 발견`);
      } catch (apiError: any) {
        console.log(`  ⚠️ KFC 공식 메뉴 API 호출 실패: ${apiError.message}`);
      }

      if (menuDataMap.size === 0) {
        // KFC 메뉴 페이지에서 메뉴 정보 추출 (Puppeteer 사용 - 동적 콘텐츠)
        console.log(`\n🌐 KFC 메뉴 페이지 접속 중...`);
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
          const page = await browser.newPage();
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          );
          await page.goto('https://www.kfckorea.com/delivery/burger', {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

        // 페이지가 완전히 로드될 때까지 추가 대기
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));

        // 스크롤을 내려서 lazy loading된 메뉴들을 로드
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });

        // 메뉴가 로드될 때까지 대기
        try {
          await page.waitForSelector('li.col.col_gutter', { timeout: 15000 });
        } catch (error) {
          console.log(
            '  ⚠️ li.col.col_gutter 셀렉터를 찾을 수 없습니다. 다른 셀렉터를 시도합니다...',
          );
          // 디버깅: 현재 페이지의 HTML 구조 확인
          const bodyHTML = await page.evaluate(() => document.body.innerHTML);
          console.log(`  📄 페이지 HTML 길이: ${bodyHTML.length} 문자`);
          const hasMenuElements =
            bodyHTML.includes('col_gutter') || bodyHTML.includes('징거');
          console.log(`  🔍 메뉴 관련 요소 존재: ${hasMenuElements}`);
        }

        // 메뉴 목록에서 각 메뉴 정보 추출
        console.log(`\n🔍 메뉴 목록에서 정보 추출 중...`);
        const menuData = await page.evaluate(() => {
          const menus: Array<{
            name: string;
            imageUrl: string;
            detailUrl?: string;
          }> = [];

          // li.col.col_gutter 셀렉터로 시도
          let menuElements = document.querySelectorAll('li.col.col_gutter');
          console.log(`li.col.col_gutter: ${menuElements.length}개 발견`);

          if (menuElements.length === 0) {
            // 다른 가능한 셀렉터들 시도
            const altSelectors = [
              'li.col',
              'li[class*="col"]',
              '.menu-item',
              '[class*="menu"]',
              '[class*="burger"]',
            ];

            for (const selector of altSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                console.log(
                  `대체 셀렉터 발견: ${selector} (${elements.length}개)`,
                );
                menuElements = elements;
                break;
              }
            }
          }

          menuElements.forEach((el) => {
            const nameEl = el.querySelector('h3');
            const imgEl = el.querySelector('img');
            const linkEl =
              el.querySelector('div.contents > a') || el.querySelector('a');

            if (nameEl && imgEl) {
              const name = nameEl.textContent?.trim() || '';
              const imageSrc = imgEl.getAttribute('src') || '';
              const imageUrl = imageSrc.startsWith('http')
                ? imageSrc
                : imageSrc.startsWith('//')
                  ? `https:${imageSrc}`
                  : imageSrc.startsWith('/')
                    ? `https://www.kfckorea.com${imageSrc}`
                    : `https://www.kfckorea.com/${imageSrc}`;
              const detailRelativeUrl = linkEl?.getAttribute('href') || '';
              const detailUrl = detailRelativeUrl.startsWith('http')
                ? detailRelativeUrl
                : detailRelativeUrl
                  ? `https://www.kfckorea.com${detailRelativeUrl}`
                  : undefined;

              if (name && imageUrl) {
                menus.push({ name, imageUrl, detailUrl });
              }
            }
          });

          return menus;
        });

        console.log(`  📊 추출된 메뉴 데이터: ${menuData.length}개`);
        if (menuData.length > 0) {
          console.log(`  📝 첫 번째 메뉴 예시: ${menuData[0].name}`);
        }

        // 추출된 메뉴 데이터를 맵에 저장
        menuData.forEach((menu) => {
          menuDataMap.set(menu.name, {
            imageUrl: menu.imageUrl,
            detailUrl: menu.detailUrl,
            description: undefined,
          });
        });

          console.log(`  ✅ ${menuDataMap.size}개의 메뉴 정보 발견`);
        } finally {
          await browser.close();
        }
      }

      // 각 타겟 메뉴에 대해 가장 정확한 스크랩된 메뉴를 찾음
      for (const targetMenu of kfcMenus) {
        let bestMatch: {
          name: string;
          imageUrl?: string;
          detailUrl?: string;
          description?: string;
        } | null = null;
        let bestScore = 0;
        const normalizedTarget = this.normalizeMenuName(targetMenu);

        for (const [menuName, menuData] of menuDataMap.entries()) {
          const normalizedMenuName = this.normalizeMenuName(menuName);
          let score = 0;

          // 1. 정확히 일치 (최고 점수) - 즉시 매칭
          if (normalizedMenuName === normalizedTarget) {
            bestMatch = { name: menuName, ...menuData };
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
          const targetWords = normalizedTarget
            .split(/\s+/)
            .filter((w) => w.length > 1);
          const menuWords = normalizedMenuName
            .split(/\s+/)
            .filter((w) => w.length > 1);
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
                menuName.length > (bestMatch?.name.length || 0))
            ) {
              bestMatch = { name: menuName, ...menuData };
              bestScore = score;
            }
          }
        }

        if (bestMatch && bestScore >= 75) {
          menuDataMap.set(targetMenu, {
            imageUrl: bestMatch.imageUrl,
            detailUrl: bestMatch.detailUrl,
            description: bestMatch.description,
          });

          console.log(
            `  ✅ 발견: "${targetMenu}" (원본 이름: "${bestMatch.name}", 점수: ${bestScore.toFixed(1)})${bestMatch.imageUrl ? ` - 이미지: ${bestMatch.imageUrl.substring(0, 60)}...` : ''}`,
          );
        } else {
          console.log(
            `  ⚠️ 매칭 실패: "${targetMenu}" (최고 점수: ${bestScore.toFixed(1)})`,
          );
        }
      }
    } catch (error: any) {
      console.error(`  ❌ 스크래핑 실패: ${error.message}`);
      errors++;
      errorDetails.push(`스크래핑 실패: ${error.message}`);
    }

    console.log(`\n📊 총 ${menuDataMap.size}개의 메뉴 정보를 찾았습니다.`);

    // 영양성분 데이터 매핑 (이미지에서 제공된 데이터 기반)
    // 사용자가 제공한 이미지(https://www.kfckorea.com/nas/kfcimg/info/info_nutrition.png)를 참고하여 수동으로 입력
    console.log(`\n📊 영양성분 데이터 매핑 중...`);
    const nutritionMap = new Map<string, any>();

    // 사용자가 제공한 영양성분 데이터
    const nutritionDataMapping: Record<string, any> = {
      칰폴레맵징거통다리: {
        kcal: 695,
        protein: 24,
        saturatedFat: 10.1,
        sodium: 1125,
        sugar: 18,
      },
      칰폴레맵징거타워: {
        kcal: 803,
        protein: 37,
        saturatedFat: 11.8,
        sodium: 1386,
        sugar: 16,
      },
      칰폴레맵징거더블다운: {
        kcal: 846,
        protein: 48,
        saturatedFat: 18.4,
        sodium: 1626,
        sugar: 6,
      },
      징거더블다운통다리: {
        kcal: 966,
        protein: 49,
        saturatedFat: 18.4,
        sodium: 1650,
        sugar: 4,
      },
      치즈징거통다리: {
        kcal: 740,
        protein: 30,
        saturatedFat: 14.8,
        sodium: 1399,
        sugar: 10,
      },
      징거BLT: {
        kcal: 695,
        protein: 37,
        saturatedFat: 11.2,
        sodium: 1101,
        sugar: 6,
      },
      징거타워: {
        kcal: 720,
        protein: 36,
        saturatedFat: 11.0,
        sodium: 1343,
        sugar: 9,
      },
      칠리징거통다리: {
        kcal: 666,
        protein: 26,
        saturatedFat: 9.2,
        sodium: 1379,
        sugar: 16,
      },
      클래식징거통다리: {
        kcal: 633,
        protein: 26,
        saturatedFat: 8.9,
        sodium: 1023,
        sugar: 13,
      },
      징거: {
        kcal: 553,
        protein: 33,
        saturatedFat: 7.4,
        sodium: 866,
        sugar: 5,
      },
      트위스터: {
        kcal: 360,
        protein: 18,
        saturatedFat: 4.4,
        sodium: 1334,
        sugar: 4,
      },
      더블커넬오리지널: {
        kcal: 793,
        protein: 33,
        saturatedFat: 11.8,
        sodium: 1749,
        sugar: 6,
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
    const activeMenuNames: string[] = [];

    for (const targetMenu of kfcMenus) {
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
          if (menuData.description !== undefined) {
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
      total: kfcMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
