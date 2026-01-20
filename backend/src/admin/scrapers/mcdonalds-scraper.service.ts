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
export class McDonaldsScraperService extends BaseScraperService {
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
   * 맥도날드 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeMcDonaldsMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug('mcdonalds');
    if (!brand) {
      throw new NotFoundException('맥도날드 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 맥도날드 메뉴 수집 시작...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // 타겟 메뉴 리스트 (21개 + 맥크리스피 마라 해쉬, 맥크리스피 마라 클래식 = 23개)
    const targetMenus = [
      '맥크리스피 마라 해쉬',
      '맥크리스피 마라 클래식',
      '빅맥',
      '맥스파이시 상하이 버거',
      '1955 버거',
      '더블 쿼터 파운더 치즈',
      '쿼터파운더 치즈',
      '맥크리스피 디럭스 버거',
      '맥크리스피 클래식 버거',
      '베이컨 토마토 디럭스',
      '맥치킨 모짜렐라',
      '맥치킨',
      '더블 불고기 버거',
      '불고기 버거',
      '슈비 버거',
      '슈슈 버거',
      '토마토 치즈 비프 버거',
      '트리플 치즈버거',
      '더블 치즈버거',
      '치즈버거',
      '햄버거',
    ];

    // 메뉴 이름 정규화 함수 (세트, 특수문자 제거)
    const normalizeMenuName = (name: string): string => {
      return name
        .replace(/맥런치/gi, '') // "맥런치" 제거 (대소문자 무시)
        .replace(/세트/gi, '') // "세트" 제거
        .replace(/단품/gi, '') // "단품" 제거
        .replace(/신제품/gi, '') // "신제품" 제거
        .replace(/[a-zA-Z]/g, '') // 영문 제거
        .replace(/\d+~\d+/g, '') // 칼로리 범위 제거 (예: "906~1045")
        .replace(/\d+kcal/gi, '') // 숫자+kcal 제거 (예: "266kcal", "582Kcal")
        .replace(/kcal/gi, '') // "kcal" 제거
        .replace(/meal/gi, '') // "meal" 제거
        .replace(/~/g, '') // "~" 제거
        .replace(/®/g, '') // 특수문자 제거
        .replace(/™/g, '')
        .replace(/해쉬/g, '해시') // 해쉬/해시 통일
        .replace(/\s+/g, ' ') // 여러 공백을 하나로
        .replace(/\b(\d+)\s+\1\b/g, '$1') // 중복된 숫자 제거 (예: "1955 버거 1955" -> "1955 버거")
        .trim()
        .toLowerCase();
    };

    // 타겟 메뉴 이름 정규화 및 Set으로 변환 (빠른 조회를 위해)
    const normalizedTargetMenus = new Map<string, string>();
    targetMenus.forEach((menu) => {
      normalizedTargetMenus.set(normalizeMenuName(menu), menu);
    });

    // 페이지별로 스크래핑 (1~4페이지)
    const totalPages = 4;
    const menuDataMap = new Map<
      string,
      { originalName: string; imageUrl: string; detailUrl?: string }
    >(); // 정규화된 이름 -> {원본 이름, 이미지 URL, 상세 URL}

    for (let page = 1; page <= totalPages; page++) {
      try {
        await this.delay(500); // 서버 부하 방지

        const pageUrl = `https://www.mcdonalds.co.kr/kor/menu/burger?ca=16&page=${page}`;
        console.log(`\n📄 페이지 ${page}/${totalPages} 처리 중: ${pageUrl}`);

        const response = await axios.get<string>(pageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        const $ = cheerio.load(String(response.data));

        // 디버깅: 페이지에서 찾은 링크 수 확인
        const allLinks = $('a[href*="/menu/"]').length;
        console.log(`  🔍 페이지 ${page}에서 /menu/ 링크 ${allLinks}개 발견`);

        // 메뉴 링크 찾기 (a 태그)
        $('a').each((i, linkElem) => {
          const $link = $(linkElem);
          const href = $link.attr('href');
          if (!href || !href.includes('/menu/')) {
            return;
          }

          // 상대 경로를 절대 경로로 변환
          let detailUrl = href;
          if (!detailUrl.startsWith('http')) {
            if (detailUrl.startsWith('//')) {
              detailUrl = `https:${detailUrl}`;
            } else if (detailUrl.startsWith('/')) {
              detailUrl = `https://www.mcdonalds.co.kr${detailUrl}`;
            } else {
              return;
            }
          }

          // 이미지 찾기
          const $img = $link.find('img').first();
          let imageUrl =
            $img.attr('src') ||
            $img.attr('data-src') ||
            $img.attr('data-lazy-src') ||
            null;

          // 메뉴 이름 찾기: 링크 텍스트 또는 이미지 alt 속성
          let linkText = $link.text().trim();
          if (!linkText || linkText.length < 2) {
            // 텍스트가 없으면 이미지 alt 속성 사용
            linkText = $img.attr('alt') || $img.attr('title') || '';
          }

          if (!linkText || linkText.length < 2) {
            return;
          }
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('//')) {
              imageUrl = `https:${imageUrl}`;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = `https://www.mcdonalds.co.kr${imageUrl}`;
            }
          }

          // 유효한 이미지 URL인지 확인
          if (
            !imageUrl ||
            imageUrl.includes('logo') ||
            imageUrl.includes('icon') ||
            imageUrl.includes('sprite') ||
            imageUrl.endsWith('.svg') ||
            imageUrl.includes('placeholder')
          ) {
            return;
          }

          const normalizedName = normalizeMenuName(linkText);

          // 타겟 메뉴 중 하나인지 확인
          let matchedTargetMenu: string | undefined =
            normalizedTargetMenus.get(normalizedName);

          // 정확히 일치하지 않으면 부분 일치 검색
          if (!matchedTargetMenu) {
            // 공백 제거한 버전으로도 비교
            const normalizedNameNoSpace = normalizedName.replace(/\s+/g, '');

            for (const [
              normalizedTarget,
              targetMenu,
            ] of normalizedTargetMenus.entries()) {
              const normalizedTargetNoSpace = normalizedTarget.replace(
                /\s+/g,
                '',
              );

              // 정규화된 이름이 타겟 메뉴 이름을 포함하거나, 타겟 메뉴 이름이 정규화된 이름을 포함하는 경우
              const includesMatch =
                normalizedName.includes(normalizedTarget) ||
                normalizedTarget.includes(normalizedName);

              // 공백 제거 버전으로도 비교 (예: "더블 쿼터파운더 치즈" vs "더블 쿼터 파운더 치즈")
              const noSpaceMatch =
                normalizedNameNoSpace.includes(normalizedTargetNoSpace) ||
                normalizedTargetNoSpace.includes(normalizedNameNoSpace);

              if (includesMatch || noSpaceMatch) {
                // 맥크리스피 마라 메뉴는 더 정확한 매칭 필요
                if (normalizedTarget.includes('맥크리스피 마라')) {
                  if (
                    normalizedTarget.includes('해시') &&
                    (normalizedName.includes('해시') ||
                      normalizedName.includes('해쉬'))
                  ) {
                    matchedTargetMenu = targetMenu;
                    break;
                  } else if (
                    normalizedTarget.includes('클래식') &&
                    normalizedName.includes('클래식')
                  ) {
                    matchedTargetMenu = targetMenu;
                    break;
                  }
                } else {
                  // 다른 메뉴는 부분 일치로 매칭
                  matchedTargetMenu = targetMenu;
                  break;
                }
              }
            }
          }

          // 타겟 메뉴에 매칭되는 경우만 저장
          if (matchedTargetMenu) {
            // 정규화된 이름을 키로 사용 (중복 방지)
            const mapKey = normalizeMenuName(matchedTargetMenu);
            const existing = menuDataMap.get(mapKey);
            if (!existing || !existing.imageUrl) {
              menuDataMap.set(mapKey, {
                originalName: matchedTargetMenu,
                imageUrl: imageUrl,
                detailUrl: detailUrl,
              });
              console.log(
                `  ✅ 발견: "${matchedTargetMenu}" (원본: "${linkText}") -> 정규화: "${normalizedName}" -> 이미지: ${imageUrl.substring(0, 60)}...`,
              );
            }
          }
        });
      } catch (error: unknown) {
        errors++;
        const errorMsg = `페이지 ${page} 처리 실패: ${error instanceof Error ? error.message : String(error)}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log(`\n📊 총 ${menuDataMap.size}개의 타겟 메뉴를 찾았습니다.`);

    // 타겟 메뉴에 대해 DB에 저장/업데이트
    const savedMenuItems = new Map<string, MenuItem>(); // 메뉴 이름 -> MenuItem (영양성분 스크래핑에 사용)

    console.log(`\n📋 스크래핑된 메뉴 데이터 (${menuDataMap.size}개):`);
    for (const [normalizedName, data] of menuDataMap.entries()) {
      console.log(`  - "${normalizedName}" -> "${data.originalName}"`);
    }

    for (const targetMenu of targetMenus) {
      try {
        const normalizedTarget = normalizeMenuName(targetMenu);

        // 스크래핑한 메뉴 데이터에서 매칭 찾기
        let matchedData: {
          originalName: string;
          imageUrl: string;
          detailUrl?: string;
        } | null = null;

        // 정확히 일치하는 경우
        if (menuDataMap.has(normalizedTarget)) {
          matchedData = menuDataMap.get(normalizedTarget)!;
          console.log(
            `  ✅ 매칭 성공: "${targetMenu}" -> "${normalizedTarget}"`,
          );
        } else {
          console.log(
            `  ⚠️ 매칭 실패: "${targetMenu}" (정규화: "${normalizedTarget}")`,
          );
        }

        // DB에서 기존 메뉴 확인
        const existingMenuItem = await this.menuItemsRepository.findOne({
          where: {
            brandId: brand.id,
            name: targetMenu,
            category: 'burger',
          },
        });

        if (existingMenuItem) {
          // 업데이트
          if (matchedData) {
            if (matchedData.imageUrl) {
              existingMenuItem.imageUrl = matchedData.imageUrl;
            }
            if (matchedData.detailUrl) {
              existingMenuItem.detailUrl = matchedData.detailUrl;
            }
            await this.menuItemsRepository.save(existingMenuItem);
            updated++;
            console.log(`  ✅ 업데이트: ${targetMenu}`);
            savedMenuItems.set(targetMenu, existingMenuItem);
          } else {
            console.log(`  ⚠️ 스크래핑 데이터 없음: ${targetMenu}`);
          }
        } else {
          // 새로 생성
          if (matchedData) {
            const menuItem = this.menuItemsRepository.create({
              brandId: brand.id,
              name: targetMenu,
              category: 'burger',
              imageUrl: matchedData.imageUrl,
              detailUrl: matchedData.detailUrl,
              isActive: true,
            });

            const savedMenuItem = await this.menuItemsRepository.save(menuItem);
            created++;
            console.log(`  ✅ 생성: ${targetMenu}`);
            savedMenuItems.set(targetMenu, savedMenuItem);
          } else {
            console.log(`  ⚠️ 스크래핑 데이터 없음: ${targetMenu}`);
            errors++;
            errorDetails.push(`${targetMenu}: 스크래핑 데이터를 찾을 수 없음`);
          }
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
   * 맥도날드 영양성분 페이지에서 영양성분 데이터를 추출하여 저장
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

    try {
      await this.delay(500);

      const nutritionUrl =
        'https://www.mcdonalds.co.kr/kor/menu/information/nutrition';
      console.log(`\n📄 영양성분 페이지 처리 중: ${nutritionUrl}`);

      const response = await axios.get<string>(nutritionUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      const $ = cheerio.load(String(response.data));

      // 메뉴 이름 정규화 함수 (영양성분 페이지용 - 메인 스크래핑과 동일)
      const normalizeMenuName = (name: string): string => {
        return name
          .replace(/맥런치/gi, '') // "맥런치" 제거 (대소문자 무시)
          .replace(/세트/gi, '') // "세트" 제거
          .replace(/단품/gi, '') // "단품" 제거
          .replace(/신제품/gi, '') // "신제품" 제거
          .replace(/[a-zA-Z]/g, '') // 영문 제거
          .replace(/\d+~\d+/g, '') // 칼로리 범위 제거 (예: "906~1045")
          .replace(/\d+kcal/gi, '') // 숫자+kcal 제거 (예: "266kcal", "582Kcal")
          .replace(/kcal/gi, '') // "kcal" 제거
          .replace(/meal/gi, '') // "meal" 제거
          .replace(/~/g, '') // "~" 제거
          .replace(/®/g, '') // 특수문자 제거
          .replace(/™/g, '')
          .replace(/해쉬/g, '해시') // 해쉬/해시 통일
          .replace(/\s+/g, ' ') // 여러 공백을 하나로
          .replace(/\b(\d+)\s+\1\b/g, '$1') // 중복된 숫자 제거 (예: "1955 버거 1955" -> "1955 버거")
          .trim()
          .toLowerCase();
      };

      // 버거 영양성분 테이블 찾기
      // 테이블 구조: 메뉴명, 중량(g), 칼로리(kcal), 당(g), 단백질(g), 포화지방(g), 나트륨(mg), 카페인(mg)
      const nutritionDataMap = new Map<
        string,
        {
          menuName: string;
          weight: number | null;
          kcal: number | null;
          sugar: number | null;
          protein: number | null;
          saturatedFat: number | null;
          sodium: number | null;
        }
      >();

      // 테이블 찾기 (다양한 선택자 시도)
      const tables = $('table');
      console.log(`  🔍 테이블 ${tables.length}개 발견`);

      // 테이블에서 데이터 추출
      // 버거 섹션만 찾기
      $('table').each((i, table) => {
        const $table = $(table);
        // caption에서 "버거" 확인
        const caption = $table.find('caption').text();
        // 이전 요소들에서 "버거" 제목 확인
        const prevHeading = $table
          .prevAll('h3, .text-18, div[class*="text-18"]')
          .first()
          .text();

        if (caption.includes('버거') || prevHeading.includes('버거')) {
          console.log(`  ✅ 버거 테이블 발견 (테이블 ${i + 1})`);
        } else {
          return; // 버거 테이블이 아님
        }

        $table.find('tbody tr').each((j, row) => {
          const $row = $(row);

          // 메뉴 이름 추출 (th 태그)
          const $menuTh = $row.find('th[scope="row"]');
          if ($menuTh.length === 0) {
            return; // 메뉴명이 없음
          }

          const menuNameText = $menuTh.text().trim();
          if (!menuNameText || menuNameText.length < 2) {
            return;
          }

          // td 태그들 찾기 (중량, 칼로리, 포화지방, 당, 단백질, 나트륨, 카페인)
          const cells = $row.find('td');
          if (cells.length < 6) {
            return; // 유효한 행이 아님
          }

          const normalizedMenuName = normalizeMenuName(menuNameText);

          // 숫자 값 추출 (공백, 쉼표, 괄호 내용 제거 후 파싱)
          const parseNumber = (text: string): number | null => {
            // 괄호와 그 안의 내용 제거 (예: "11g(71%)" -> "11g")
            let cleaned = text.replace(/\([^)]*\)/g, '').trim();
            // 단위 제거 (g, mg, ml, kcal 등)
            cleaned = cleaned.replace(/[a-zA-Z%]/g, '').trim();
            // 공백, 쉼표 제거
            cleaned = cleaned.replace(/[,\s]/g, '').trim();
            if (!cleaned || cleaned === '-' || cleaned === '') {
              return null;
            }
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
          };

          // 셀 순서: 중량(g/ml), 열량(kcal), 포화지방(g), 당(g), 단백질(g), 나트륨(mg), 카페인(mg)
          const weight = parseNumber($(cells[0]).text()); // 중량(g/ml)
          const kcal = parseNumber($(cells[1]).text()); // 열량(kcal)
          const saturatedFat = parseNumber($(cells[2]).text()); // 포화지방(g)
          const sugar = parseNumber($(cells[3]).text()); // 당(g)
          const protein = parseNumber($(cells[4]).text()); // 단백질(g)
          const sodium = parseNumber($(cells[5]).text()); // 나트륨(mg)

          // 영양성분 데이터가 하나라도 있으면 저장
          if (kcal !== null || protein !== null || saturatedFat !== null) {
            // 이미 같은 정규화된 이름이 있으면 덮어쓰지 않음 (더 긴 이름 우선)
            const existing = nutritionDataMap.get(normalizedMenuName);
            if (!existing || menuNameText.length > existing.menuName.length) {
              nutritionDataMap.set(normalizedMenuName, {
                menuName: menuNameText,
                weight,
                kcal,
                sugar,
                protein,
                saturatedFat,
                sodium,
              });
              console.log(
                `  📝 영양성분 발견: "${menuNameText}" -> "${normalizedMenuName}" (칼로리: ${kcal ?? 'N/A'})`,
              );
            }
          }
        });
      });

      console.log(
        `\n📊 총 ${nutritionDataMap.size}개의 영양성분 데이터를 찾았습니다.`,
      );

      // 저장된 메뉴 아이템과 영양성분 데이터 매칭
      for (const [menuName, menuItem] of menuItemsMap.entries()) {
        try {
          const normalizedMenuName = normalizeMenuName(menuName);

          // 정확히 일치하는 영양성분 데이터 찾기
          let nutritionData = nutritionDataMap.get(normalizedMenuName);

          // 정확히 일치하지 않으면 부분 일치 검색
          if (!nutritionData) {
            // 공백 제거한 버전으로도 비교
            const normalizedMenuNameNoSpace = normalizedMenuName.replace(
              /\s+/g,
              '',
            );

            // 메뉴 이름의 핵심 키워드 추출 (2글자 이상의 단어들)
            const menuKeywords = normalizedMenuName
              .split(/\s+/)
              .filter((word) => word.length >= 2);

            let bestMatch:
              | {
                  menuName: string;
                  weight: number | null;
                  kcal: number | null;
                  sugar: number | null;
                  protein: number | null;
                  saturatedFat: number | null;
                  sodium: number | null;
                }
              | undefined = undefined;
            let bestMatchScore = 0;

            for (const [
              normalizedNutritionName,
              data,
            ] of nutritionDataMap.entries()) {
              const normalizedNutritionNameNoSpace =
                normalizedNutritionName.replace(/\s+/g, '');

              // 정확히 일치하는 경우
              if (
                normalizedNutritionName === normalizedMenuName ||
                normalizedMenuName === normalizedNutritionName ||
                normalizedNutritionNameNoSpace === normalizedMenuNameNoSpace
              ) {
                nutritionData = data;
                break;
              }

              // 부분 일치 검색 (공백 포함 및 제거 버전 모두)
              const includesMatch =
                normalizedNutritionName.includes(normalizedMenuName) ||
                normalizedMenuName.includes(normalizedNutritionName);

              const noSpaceMatch =
                normalizedNutritionNameNoSpace.includes(
                  normalizedMenuNameNoSpace,
                ) ||
                normalizedMenuNameNoSpace.includes(
                  normalizedNutritionNameNoSpace,
                );

              if (includesMatch || noSpaceMatch) {
                // 키워드 매칭 점수 계산
                const matchScore = menuKeywords.filter((keyword) =>
                  normalizedNutritionName.includes(keyword),
                ).length;

                if (matchScore > bestMatchScore) {
                  bestMatchScore = matchScore;
                  bestMatch = data;
                }
              }
            }

            // 최고 점수의 매칭이 있으면 사용
            if (!nutritionData && bestMatch) {
              nutritionData = bestMatch;
            }
          }

          if (nutritionData) {
            // 기존 영양성분 데이터 확인
            const existingNutrition = await this.nutritionRepository.findOne({
              where: { menuItemId: menuItem.id },
            });

            if (existingNutrition) {
              // 업데이트
              if (nutritionData.kcal !== null) {
                existingNutrition.kcal = nutritionData.kcal;
              }
              if (nutritionData.protein !== null) {
                existingNutrition.protein = nutritionData.protein;
              }
              if (nutritionData.saturatedFat !== null) {
                existingNutrition.saturatedFat = nutritionData.saturatedFat;
              }
              if (nutritionData.sodium !== null) {
                existingNutrition.sodium = nutritionData.sodium;
              }
              if (nutritionData.sugar !== null) {
                existingNutrition.sugar = nutritionData.sugar;
              }
              await this.nutritionRepository.save(existingNutrition);
              saved++;
              console.log(
                `  ✅ 영양성분 업데이트: ${menuName} (칼로리: ${nutritionData.kcal ?? 'N/A'}kcal)`,
              );
            } else {
              // 새로 생성
              const nutrition = this.nutritionRepository.create({
                menuItemId: menuItem.id,
                kcal: nutritionData.kcal,
                protein: nutritionData.protein,
                saturatedFat: nutritionData.saturatedFat,
                sodium: nutritionData.sodium,
                sugar: nutritionData.sugar,
              } as Nutrition);
              await this.nutritionRepository.save(nutrition);
              saved++;
              console.log(
                `  ✅ 영양성분 생성: ${menuName} (칼로리: ${nutritionData.kcal ?? 'N/A'}kcal)`,
              );
            }
          } else {
            console.log(
              `  ⚠️ 영양성분 데이터 없음: ${menuName} (정규화: "${normalizedMenuName}")`,
            );
            // 디버깅: 유사한 영양성분 데이터 출력
            const similarNames = Array.from(nutritionDataMap.keys())
              .filter(
                (name) =>
                  name.includes(normalizedMenuName.substring(0, 3)) ||
                  normalizedMenuName.includes(name.substring(0, 3)),
              )
              .slice(0, 3);
            if (similarNames.length > 0) {
              console.log(`    💡 유사한 이름: ${similarNames.join(', ')}`);
            }
          }
        } catch (error: unknown) {
          errors++;
          const errorMsg = `${menuName} 영양성분 처리 실패: ${error instanceof Error ? error.message : String(error)}`;
          errorDetails.push(errorMsg);
          console.error(`  ❌ ${errorMsg}`);
        }
      }

      console.log(`\n📊 영양성분 처리 완료: ${saved}개 저장, ${errors}개 실패`);
    } catch (error: unknown) {
      errors++;
      const errorMsg = `영양성분 페이지 처리 실패: ${error instanceof Error ? error.message : String(error)}`;
      errorDetails.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }

    return { saved, errors, errorDetails };
  }
}
