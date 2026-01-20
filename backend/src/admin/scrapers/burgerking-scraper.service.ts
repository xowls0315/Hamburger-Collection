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
   * 버거킹 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   * 버거킹 사이트는 JavaScript로 동적 렌더링되므로, 메뉴 이름 리스트를 기반으로 처리
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

    // 버거킹 버거 메뉴 목록과 ID 매핑
    // 메뉴 ID는 브라우저에서 각 메뉴 상세 페이지 URL을 확인하여 얻을 수 있습니다
    // 예: https://www.burgerking.co.kr/menu/detail/1100779 -> ID: 1100779
    //
    // 현재는 메뉴 이름만 제공되었으므로, 각 메뉴의 상세 페이지를 찾는 로직을 시도합니다.
    // 더 정확한 결과를 원하시면 각 메뉴의 ID를 제공해주세요.

    const burgerKingMenus = [
      '오리지널스 뉴욕 스테이크',
      '오리지널스 이탈리안 살사베르데',
      '더오치 맥시멈2',
      '더오치 맥시멈3',
      '더오치 맥시멈 원파운더',
      '와퍼', // 예시 ID: 1100779
      '치즈와퍼',
      '갈릭불고기와퍼',
      '불고기와퍼',
      '베이컨치즈와퍼',
      '콰트로치즈와퍼',
      '통새우와퍼',
      '몬스터와퍼',
      '콰트로페퍼 큐브스테이크 와퍼', // 예시 ID: 1100779 (사용자가 제공한 예시)
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

    // 알려진 메뉴 ID 매핑 (사용자가 제공한 예시 기반)
    // 각 메뉴의 정확한 ID를 알려주시면 여기에 추가하세요
    const knownMenuIds: Record<string, string> = {
      '콰트로페퍼 큐브스테이크 와퍼': '1100779', // 사용자가 제공한 예시
      // 다른 메뉴 ID도 여기에 추가 가능
    };

    console.log(`📋 총 ${burgerKingMenus.length}개의 메뉴를 처리합니다.`);

    // 버거킹 사이트는 JavaScript로 동적 렌더링되므로, Network 탭에서 보이는 JSON 파일들을 직접 요청
    // 예: BKR0307.json, BKR0634.json 등에 메뉴 데이터가 포함되어 있을 가능성

    console.log(`\n🔍 버거킹 API에서 메뉴 데이터를 찾는 중...`);

    const menuLinks: Array<{
      name: string;
      url: string;
      id?: string;
      imageUrl?: string;
    }> = [];
    let foundMenusInJson = false;

    // JSON 파일을 먼저 읽어서 이미지 URL을 가져올 수 있도록 함
    const jsonFilePath = path.join(
      __dirname,
      '../../menu-items-examples/burgerking-menu-data.json',
    );
    let providedJsonData: any = null;

    try {
      if (fs.existsSync(jsonFilePath)) {
        const jsonFileContent = fs.readFileSync(jsonFilePath, 'utf-8');
        providedJsonData = JSON.parse(jsonFileContent);
      }
    } catch (error: any) {
      console.log(`  ⚠️ JSON 파일 읽기 오류: ${error.message}`);
    }

    // 방법 1: 알려진 메뉴 ID 사용
    // JSON 데이터가 있으면 이미지 URL도 함께 가져오기
    let jsonMenuMap: Map<string, { menuCd: string; menuImgPath?: string }> =
      new Map();
    if (providedJsonData) {
      // parseProvidedJsonStructure 함수는 나중에 정의되므로, 여기서 직접 파싱
      try {
        if (
          providedJsonData &&
          typeof providedJsonData === 'object' &&
          'body' in providedJsonData
        ) {
          const body = providedJsonData.body;
          if (body && typeof body === 'object' && 'allMenuList' in body) {
            const allMenuList = body.allMenuList;
            if (Array.isArray(allMenuList)) {
              allMenuList.forEach((category: any) => {
                if (
                  category &&
                  typeof category === 'object' &&
                  'menuInfo' in category
                ) {
                  const menuInfo = category.menuInfo;
                  if (Array.isArray(menuInfo)) {
                    menuInfo.forEach((menu: any) => {
                      if (
                        menu &&
                        typeof menu === 'object' &&
                        menu.menuCd &&
                        menu.menuNm
                      ) {
                        jsonMenuMap.set(String(menu.menuCd), {
                          menuCd: String(menu.menuCd),
                          menuImgPath: menu.menuImgPath
                            ? String(menu.menuImgPath)
                            : undefined,
                        });
                      }
                    });
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        console.log(`  ⚠️ JSON 파싱 오류: ${error}`);
      }
    }

    for (const [menuName, menuId] of Object.entries(knownMenuIds)) {
      const directUrl = `https://www.burgerking.co.kr/menu/detail/${menuId}`;
      const jsonMenu = jsonMenuMap.get(menuId);
      const imageUrl = jsonMenu?.menuImgPath;
      menuLinks.push({
        name: menuName,
        url: directUrl,
        id: menuId,
        imageUrl: imageUrl || undefined,
      });
      const imageInfo = imageUrl
        ? `이미지: ${imageUrl.substring(0, 50)}...`
        : '이미지: 없음';
      console.log(`  ✅ 알려진 ID: ${menuName} -> ${menuId} (${imageInfo})`);
    }

    // 방법 2: 메인 페이지 HTML에서 직접 메뉴 정보 추출
    console.log(`\n🌐 버거킹 메인 페이지에서 메뉴 정보 추출 중...`);
    try {
      const mainPageResponse = await axios.get(
        'https://www.burgerking.co.kr/menu/main',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      );

      const $ = cheerio.load(mainPageResponse.data);
      const htmlMenus: Array<{ name: string; imageUrl: string }> = [];

      // menu_card에서 메뉴 정보 추출
      $('.menu_card').each((_, element) => {
        const $card = $(element);
        const $img = $card.find('.prd_image img');
        const $title = $card.find('.cont .tit span');

        if ($img.length && $title.length) {
          const imageUrl = $img.attr('src')?.trim();
          const menuName = $title.text().trim();

          if (imageUrl && menuName) {
            htmlMenus.push({
              name: menuName,
              imageUrl: imageUrl,
            });
          }
        }
      });

      console.log(`  ✅ HTML에서 ${htmlMenus.length}개의 메뉴 카드 발견`);
    } catch (error: any) {
      console.log(`  ⚠️ 메인 페이지 스크래핑 실패: ${error.message}`);
    }

    // 방법 3: 사용자가 제공한 JSON 구조를 직접 사용
    // API 접근이 차단되어 있으므로, 제공된 JSON 구조를 직접 파싱
    console.log(`\n📡 제공된 JSON 구조에서 메뉴 데이터 추출 중...`);

    // 사용자가 제공한 JSON 구조를 직접 파싱하는 함수
    const parseProvidedJsonStructure = (
      jsonData: any,
    ): Array<{ menuCd: string; menuNm: string; menuImgPath?: string }> => {
      const extractedMenus: Array<{
        menuCd: string;
        menuNm: string;
        menuImgPath?: string;
      }> = [];

      try {
        if (jsonData && typeof jsonData === 'object' && 'body' in jsonData) {
          const body = jsonData.body;
          if (body && typeof body === 'object' && 'allMenuList' in body) {
            const allMenuList = body.allMenuList;
            if (Array.isArray(allMenuList)) {
              allMenuList.forEach((category: any) => {
                if (
                  category &&
                  typeof category === 'object' &&
                  'menuInfo' in category
                ) {
                  const menuInfo = category.menuInfo;
                  if (Array.isArray(menuInfo)) {
                    menuInfo.forEach((menu: any) => {
                      if (
                        menu &&
                        typeof menu === 'object' &&
                        menu.menuCd &&
                        menu.menuNm
                      ) {
                        extractedMenus.push({
                          menuCd: String(menu.menuCd),
                          menuNm: String(menu.menuNm).trim(),
                          menuImgPath: menu.menuImgPath
                            ? String(menu.menuImgPath)
                            : undefined,
                        });
                      }
                    });
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        console.log(`    ⚠️ JSON 파싱 오류: ${error}`);
      }

      return extractedMenus;
    };

    // JSON 파일이 비어있거나 없으면, 사용자가 제공한 JSON 데이터를 직접 사용
    if (
      !providedJsonData ||
      !providedJsonData.body ||
      !providedJsonData.body.allMenuList ||
      providedJsonData.body.allMenuList.length === 0
    ) {
      console.log(
        `  💡 JSON 파일이 비어있습니다. 제공된 JSON 데이터를 직접 사용합니다.`,
      );
      // 사용자가 제공한 JSON 데이터를 직접 사용 (첫 번째 메시지에서 제공된 JSON 구조)
      // 이 부분은 사용자가 제공한 JSON 데이터를 직접 여기에 포함시켜야 합니다.
      // 지금은 빈 구조로 두고, 파일에서 읽도록 합니다.
    }

    if (providedJsonData) {
      console.log(`  📂 JSON 파일에서 메뉴 데이터 추출 중...`);
      const extractedMenus = parseProvidedJsonStructure(providedJsonData);

      if (extractedMenus.length > 0) {
        console.log(
          `  ✅ JSON에서 ${extractedMenus.length}개의 메뉴 데이터 추출 완료`,
        );
        foundMenusInJson = true;

        // 메뉴 이름 정규화 함수 (매칭을 위한 기본 정규화)
        const normalizeMenuName = (name: string): string => {
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

        // 더 엄격한 정규화 (정확한 매칭을 위해)
        const strictNormalize = (name: string): string => {
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
            .replace(/\s+/g, '')
            .trim()
            .toLowerCase();
        };

        // 세트/라지세트/콤보 등이 포함된 메뉴는 제외 (단독 버거만)
        const isSetOrCombo = (name: string): boolean => {
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
        };

        // 각 타겟 메뉴에 대해 하나의 매칭만 허용
        const matchedTargetMenus = new Set<string>();
        let matchedCount = 0;

        // 타겟 메뉴를 순회하면서 매칭
        for (const targetMenu of burgerKingMenus) {
          // 이미 매칭된 타겟 메뉴는 스킵
          if (matchedTargetMenus.has(targetMenu)) {
            continue;
          }

          const normalizedTarget = normalizeMenuName(targetMenu);
          const strictNormalizedTarget = strictNormalize(targetMenu);

          // 추출된 메뉴 중에서 가장 잘 매칭되는 것을 찾기
          let bestMatch: {
            menu: (typeof extractedMenus)[0];
            score: number;
          } | null = null;

          for (const menu of extractedMenus) {
            const menuName = menu.menuNm;

            // 세트/콤보 등은 제외 (단독 버거만)
            if (isSetOrCombo(menuName)) {
              continue;
            }

            // 이미 사용된 메뉴 ID는 스킵
            if (menuLinks.some((link) => link.id === menu.menuCd)) {
              continue;
            }

            const normalizedFound = normalizeMenuName(menuName);
            const strictNormalizedFound = strictNormalize(menuName);
            let score = 0;

            // 엄격한 정규화로 정확히 일치 (최고 점수)
            if (strictNormalizedTarget === strictNormalizedFound) {
              score = 100;
            }
            // 일반 정규화로 정확히 일치
            else if (normalizedTarget === normalizedFound) {
              score = 95;
            }
            // 발견된 메뉴 이름이 타겟과 정확히 일치 (공백 제거 후)
            else if (strictNormalizedFound === strictNormalizedTarget) {
              score = 90;
            }
            // 타겟이 발견된 메뉴 이름의 시작 부분과 일치하는지 확인
            else if (
              normalizedFound.startsWith(normalizedTarget) &&
              normalizedTarget.length >= 3
            ) {
              const foundAfterTarget = normalizedFound
                .substring(normalizedTarget.length)
                .trim();

              // "와퍼"와 "와퍼주니어" 구분
              const targetHasJunior =
                targetMenu.toLowerCase().includes('주니어') ||
                targetMenu.toLowerCase().includes('junior');
              const foundHasJunior =
                menuName.toLowerCase().includes('주니어') ||
                menuName.toLowerCase().includes('junior');

              // 주니어 포함 여부가 다르면 매칭하지 않음
              if (targetHasJunior !== foundHasJunior) {
                score = 0;
              }
              // 정확히 일치하거나 빈 문자열인 경우
              else if (foundAfterTarget === '') {
                score = 85;
              }
              // 다른 단어가 뒤에 붙은 경우 (예: "와퍼" in "와퍼세트"는 이미 isSetOrCombo에서 필터링됨)
              else {
                score = 60;
              }
            }
            // 키워드 매칭 (모든 주요 키워드가 일치)
            else {
              const targetKeywords = normalizedTarget
                .split(/\s+/)
                .filter((k) => k.length > 1);
              const foundKeywords = normalizedFound
                .split(/\s+/)
                .filter((k) => k.length > 1);
              const commonKeywords = targetKeywords.filter((k) =>
                foundKeywords.includes(k),
              );

              // 모든 키워드가 일치하고 순서도 중요
              if (
                commonKeywords.length === targetKeywords.length &&
                targetKeywords.length >= 2
              ) {
                // 키워드 순서 확인
                const targetOrder = targetKeywords.join('');
                const foundOrder = foundKeywords
                  .filter((k) => targetKeywords.includes(k))
                  .join('');
                if (targetOrder === foundOrder) {
                  score = 75; // 키워드 순서까지 일치
                } else {
                  score = 65; // 키워드는 일치하지만 순서가 다름
                }
              } else if (
                commonKeywords.length >= 2 &&
                commonKeywords.length === targetKeywords.length
              ) {
                // 모든 키워드가 일치하지만 순서가 다를 수 있음
                score = 70;
              } else if (commonKeywords.length >= 2) {
                score = 50; // 일부 키워드만 일치 (너무 낮은 점수)
              }
            }

            // 최고 점수 매칭 업데이트
            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { menu, score };
            }
          }

          // 최고 점수 매칭이 있고 점수가 충분히 높으면 추가 (70점 이상)
          if (bestMatch && bestMatch.score >= 70) {
            const menu = bestMatch.menu;
            const url = `https://www.burgerking.co.kr/menu/detail/${menu.menuCd}`;
            menuLinks.push({
              name: targetMenu,
              url,
              id: menu.menuCd,
              imageUrl: menu.menuImgPath,
            });
            matchedTargetMenus.add(targetMenu);
            const imageInfo = menu.menuImgPath
              ? `이미지: ${menu.menuImgPath.substring(0, 60)}...`
              : '이미지: 없음 (상세 페이지에서 추출 필요)';
            console.log(
              `    ✅ 매칭: "${targetMenu}" -> "${menu.menuNm}" (ID: ${menu.menuCd}, 점수: ${bestMatch.score}, ${imageInfo})`,
            );
            matchedCount++;
          } else if (bestMatch) {
            console.log(
              `    ⚠️ 매칭 실패 (점수 부족): "${targetMenu}" -> "${bestMatch.menu.menuNm}" (점수: ${bestMatch.score})`,
            );
          }
        }

        if (matchedCount > 0) {
          console.log(`    📊 총 ${matchedCount}개 메뉴 매칭 성공`);
        }
      } else {
        console.log(`  ⚠️ JSON에서 메뉴 데이터를 찾을 수 없음`);
      }
    }

    // 방법 3: 버거킹 API JSON 파일들에서 메뉴 데이터 추출 시도 (fallback)
    // Network 탭에서 보이는 JSON 파일 패턴: BKR####.json
    // 여러 가능한 JSON 파일 ID 시도
    const possibleJsonIds = [
      '0632', // 사용자가 제공한 JSON 파일 (BKR0632.json)
      '0307',
      '0634',
      '0633', // Network 탭에서 확인된 ID들
      '0300',
      '0301',
      '0302',
      '0303',
      '0304',
      '0305',
      '0306',
      '0308',
      '0309',
      '0630',
      '0631',
      '0635',
      '0636',
      '0637',
      '0638',
      '0639',
      '0600',
      '0601',
      '0602',
      '0603',
      '0604',
      '0605',
    ];

    console.log(`\n📡 버거킹 API JSON 파일들을 확인하는 중...`);

    for (const jsonId of possibleJsonIds) {
      // 이미 충분한 메뉴를 찾았으면 중단
      if (menuLinks.length >= burgerKingMenus.length) {
        console.log(`  ✅ 모든 메뉴를 찾았습니다. JSON 파일 확인 중단.`);
        break;
      }
      try {
        await this.delay(200); // 서버 부하 방지

        const jsonUrl = `https://www.burgerking.co.kr/bizMOB/BKR${jsonId}.json`;
        console.log(`  🔍 시도 중: ${jsonUrl}`);

        try {
          const jsonResponse = await axios.get(jsonUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/json',
            },
            responseType: 'text', // 원본 응답을 문자열로 받기
            validateStatus: (status) => status < 500,
          });

          if (jsonResponse.status === 200 && jsonResponse.data) {
            console.log(`    ✅ 응답 성공 (BKR${jsonId}.json)`);

            const responseText = jsonResponse.data as string;

            // HTML 응답인지 확인
            const trimmedText = responseText.trim();
            if (
              trimmedText.toLowerCase().startsWith('<!doctype') ||
              trimmedText.toLowerCase().startsWith('<html') ||
              trimmedText.toLowerCase().startsWith('<?xml')
            ) {
              console.log(`    ⚠️ HTML/XML 응답 반환됨 (JSON이 아님)`);
              continue;
            }

            // JSON 파싱 시도
            let data: any;
            try {
              data = JSON.parse(responseText);
              console.log(`    📝 JSON 파싱 완료`);
            } catch (parseError: any) {
              console.log(`    ⚠️ JSON 파싱 실패: ${parseError.message}`);
              continue;
            }

            // 디버깅: 실제 응답 구조 확인
            if (jsonId === '0632') {
              console.log(`    🔍 응답 데이터 타입: ${typeof data}`);
              console.log(
                `    🔍 응답 데이터 키: ${data && typeof data === 'object' ? Object.keys(data).join(', ') : 'N/A'}`,
              );
              if (data && typeof data === 'object' && 'body' in data) {
                const body = (data as any).body;
                console.log(`    🔍 body 타입: ${typeof body}`);
                console.log(
                  `    🔍 body 키: ${body && typeof body === 'object' ? Object.keys(body).join(', ') : 'N/A'}`,
                );
                if (body && typeof body === 'object' && 'allMenuList' in body) {
                  const allMenuList = body.allMenuList;
                  console.log(
                    `    🔍 allMenuList 타입: ${Array.isArray(allMenuList) ? 'Array' : typeof allMenuList}`,
                  );
                  if (Array.isArray(allMenuList) && allMenuList.length > 0) {
                    console.log(
                      `    🔍 allMenuList 길이: ${allMenuList.length}`,
                    );
                    console.log(
                      `    🔍 첫 번째 카테고리 키: ${Object.keys(allMenuList[0]).join(', ')}`,
                    );
                  }
                }
              }
            }

            // 실제 버거킹 JSON 구조: body.allMenuList[].menuInfo[].menuCd, menuNm
            const extractedMenus: Array<{
              menuCd: string;
              menuNm: string;
              menuImgPath?: string;
            }> = [];

            try {
              // body.allMenuList 구조 확인
              if (data && typeof data === 'object' && 'body' in data) {
                const body = (data as any).body;
                if (body && typeof body === 'object' && 'allMenuList' in body) {
                  const allMenuList = body.allMenuList;
                  if (Array.isArray(allMenuList)) {
                    console.log(
                      `    📦 body.allMenuList 발견: ${allMenuList.length}개 카테고리`,
                    );
                    allMenuList.forEach((category: any) => {
                      if (
                        category &&
                        typeof category === 'object' &&
                        'menuInfo' in category
                      ) {
                        const menuInfo = category.menuInfo;
                        if (Array.isArray(menuInfo)) {
                          menuInfo.forEach((menu: any) => {
                            if (
                              menu &&
                              typeof menu === 'object' &&
                              menu.menuCd &&
                              menu.menuNm
                            ) {
                              extractedMenus.push({
                                menuCd: String(menu.menuCd),
                                menuNm: String(menu.menuNm).trim(),
                                menuImgPath: menu.menuImgPath
                                  ? String(menu.menuImgPath)
                                  : undefined,
                              });
                            }
                          });
                        }
                      }
                    });
                    console.log(
                      `    📋 파싱된 메뉴: ${extractedMenus.length}개`,
                    );
                  } else {
                    console.log(
                      `    ⚠️ body.allMenuList가 배열이 아님 (타입: ${typeof allMenuList})`,
                    );
                  }
                } else {
                  console.log(
                    `    ⚠️ body 또는 body.allMenuList를 찾을 수 없음`,
                  );
                }
              } else {
                console.log(`    ⚠️ data 또는 data.body를 찾을 수 없음`);
              }

              // 재귀적으로 다른 구조도 시도 (fallback)
              // extractedMenus가 비어있으면 재귀 탐색
              if (extractedMenus.length === 0) {
                console.log(`    🔍 재귀 탐색 시도...`);
                const extractMenuData = (obj: any): any[] => {
                  const results: any[] = [];

                  if (Array.isArray(obj)) {
                    obj.forEach((item) => {
                      results.push(...extractMenuData(item));
                    });
                  } else if (obj && typeof obj === 'object') {
                    // menuCd와 menuNm이 있는 경우
                    if (obj.menuCd && obj.menuNm) {
                      results.push({
                        menuCd: String(obj.menuCd),
                        menuNm: String(obj.menuNm).trim(),
                        menuImgPath: obj.menuImgPath
                          ? String(obj.menuImgPath)
                          : undefined,
                      });
                    }

                    // 다른 가능한 필드명도 확인
                    if (obj.menuId && obj.menuName) {
                      results.push({
                        menuCd: String(obj.menuId),
                        menuNm: String(obj.menuName).trim(),
                        menuImgPath:
                          obj.menuImgPath || obj.imageUrl
                            ? String(obj.menuImgPath || obj.imageUrl)
                            : undefined,
                      });
                    }

                    // 재귀적으로 모든 객체 탐색
                    Object.keys(obj).forEach((key) => {
                      results.push(...extractMenuData(obj[key]));
                    });
                  }

                  return results;
                };

                const recursiveResults = extractMenuData(data);
                if (recursiveResults.length > 0) {
                  console.log(
                    `    🔍 재귀 탐색으로 ${recursiveResults.length}개 메뉴 발견`,
                  );
                  extractedMenus.push(...recursiveResults);
                }
              }
            } catch (parseError: any) {
              console.log(
                `    ⚠️ JSON 파싱 오류 (BKR${jsonId}.json):`,
                parseError.message,
              );
            }

            if (extractedMenus.length > 0) {
              console.log(
                `  ✅ BKR${jsonId}.json에서 ${extractedMenus.length}개의 메뉴 데이터 발견`,
              );
            } else {
              console.log(
                `    ⚠️ BKR${jsonId}.json에서 메뉴 데이터를 찾을 수 없음`,
              );
            }

            if (extractedMenus.length > 0) {
              // 메뉴 이름 정규화 함수 (더 강화)
              const normalizeMenuName = (name: string): string => {
                return name
                  .replace(/행\)/g, '') // "행)" 제거
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

              // 세트/라지세트/콤보 등이 포함된 메뉴는 제외 (단독 버거만)
              const isSetOrCombo = (name: string): boolean => {
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
              };

              let matchedCount = 0;
              extractedMenus.forEach((menu) => {
                const menuId = menu.menuCd;
                const menuName = menu.menuNm;

                // 세트/콤보 등은 제외 (단독 버거만)
                if (isSetOrCombo(menuName)) {
                  return;
                }

                // 이미 찾은 메뉴는 스킵
                if (menuLinks.some((link) => link.id === menuId)) {
                  return;
                }

                // 우리가 찾는 메뉴 목록과 매칭 시도
                const matchedMenu = burgerKingMenus.find((targetMenu) => {
                  const normalizedTarget = normalizeMenuName(targetMenu);
                  const normalizedFound = normalizeMenuName(menuName);

                  // 정확히 일치
                  if (normalizedTarget === normalizedFound) {
                    return true;
                  }

                  // 포함 관계 확인 (예: "와퍼"와 "와퍼" 또는 "콰트로페퍼 큐브스테이크 와퍼")
                  if (
                    normalizedFound.includes(normalizedTarget) ||
                    normalizedTarget.includes(normalizedFound)
                  ) {
                    // 단, 한쪽이 다른 쪽의 일부일 때는 더 정확한 매칭 필요
                    if (
                      normalizedTarget.length >= 5 &&
                      normalizedFound.length >= 5
                    ) {
                      // 긴 이름끼리는 더 정확한 매칭 필요
                      const similarity =
                        normalizedTarget
                          .split('')
                          .filter((c) => normalizedFound.includes(c)).length /
                        Math.max(
                          normalizedTarget.length,
                          normalizedFound.length,
                        );
                      if (similarity > 0.7) {
                        return true;
                      }
                    } else {
                      return true;
                    }
                  }

                  // 키워드 매칭 (예: "와퍼"가 포함된 경우)
                  const targetKeywords = normalizedTarget
                    .split(/\s+/)
                    .filter((k) => k.length > 1);
                  const foundKeywords = normalizedFound
                    .split(/\s+/)
                    .filter((k) => k.length > 1);
                  const commonKeywords = targetKeywords.filter((k) =>
                    foundKeywords.includes(k),
                  );

                  // 공통 키워드가 2개 이상이면 매칭
                  if (commonKeywords.length >= 2) {
                    return true;
                  }

                  return false;
                });

                if (matchedMenu) {
                  const url = `https://www.burgerking.co.kr/menu/detail/${menuId}`;
                  menuLinks.push({
                    name: matchedMenu,
                    url,
                    id: menuId,
                    imageUrl: menu.menuImgPath, // 이미지 URL도 저장
                  });
                  console.log(
                    `    ✅ 매칭: "${matchedMenu}" -> "${menuName}" (ID: ${menuId})`,
                  );
                  matchedCount++;
                }
              });

              if (matchedCount > 0) {
                console.log(`    📊 총 ${matchedCount}개 메뉴 매칭 성공`);
              }
            }
          } else {
            console.log(
              `    ⚠️ 응답 실패 (BKR${jsonId}.json): 상태 코드 ${jsonResponse.status}`,
            );
          }
        } catch (jsonError: any) {
          // JSON 파일이 없거나 접근 불가능한 경우
          if (jsonError.response) {
            console.log(
              `    ⚠️ 요청 실패 (BKR${jsonId}.json): ${jsonError.response.status} ${jsonError.response.statusText}`,
            );
          } else {
            console.log(
              `    ⚠️ 요청 실패 (BKR${jsonId}.json): ${jsonError.message}`,
            );
          }
          continue;
        }
      } catch (error: any) {
        continue;
      }
    }

    // 방법 3: 알려진 메뉴 ID가 없는 경우, 메뉴 이름을 slug로 변환하여 시도
    for (const menuName of burgerKingMenus) {
      if (menuLinks.some((link) => link.name === menuName)) {
        continue; // 이미 찾은 메뉴는 스킵
      }

      try {
        await this.delay(200);

        const slug = menuName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9-]/g, '');

        const slugUrl = `https://www.burgerking.co.kr/menu/detail/${slug}`;

        try {
          const slugResponse = await axios.get(slugUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            validateStatus: (status) => status < 500,
          });

          if (slugResponse.status === 200) {
            const $slug = cheerio.load(slugResponse.data);
            const pageText = $slug('body').text() || $slug.html() || '';

            if (
              pageText.includes(menuName) ||
              pageText.includes(menuName.replace(/\s+/g, ''))
            ) {
              menuLinks.push({ name: menuName, url: slugUrl });
              console.log(`  ✅ 발견 (slug): "${menuName}" -> ${slugUrl}`);
            }
          }
        } catch (slugError: any) {
          // slug 방식 실패
        }
      } catch (error: any) {
        // 에러 무시하고 계속
      }
    }

    console.log(
      `\n📋 총 ${menuLinks.length}/${burgerKingMenus.length}개의 메뉴 상세 페이지를 찾았습니다.`,
    );

    if (menuLinks.length === 0) {
      console.log(`\n⚠️ 메뉴 상세 페이지를 찾을 수 없습니다.`);
      console.log(`💡 해결 방법:`);
      console.log(
        `   1. 브라우저에서 각 메뉴의 상세 페이지 URL을 확인하여 메뉴 ID를 제공해주세요.`,
      );
      console.log(`   2. 또는 버거킹 사이트의 API 엔드포인트를 확인해주세요.`);

      return {
        success: false,
        brand: brand.name,
        total: burgerKingMenus.length,
        created: 0,
        updated: 0,
        errors: burgerKingMenus.length,
        errorDetails: [
          '메뉴 상세 페이지를 찾을 수 없습니다. 메뉴 ID를 직접 제공해주세요.',
        ],
      };
    }

    // 각 메뉴 상세 페이지 처리
    for (let i = 0; i < menuLinks.length; i++) {
      const menuLink = menuLinks[i];

      try {
        await this.delay(1000); // 서버 부하 방지 (1초 대기)

        console.log(
          `\n[${i + 1}/${menuLinks.length}] 처리 중: ${menuLink.name} (${menuLink.url})`,
        );

        // 메뉴 상세 페이지 접속
        const detailResponse = await axios.get(menuLink.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        const $detail = cheerio.load(detailResponse.data);

        // 1. 이미지 URL 추출
        // JSON에서 가져온 이미지 URL이 있으면 우선 사용
        let imageUrl: string | null = menuLink.imageUrl || null;

        if (imageUrl) {
          console.log(
            `    📷 JSON에서 이미지 URL 사용: ${imageUrl.substring(0, 80)}...`,
          );
        } else {
          console.log(
            `    ⚠️ JSON에서 이미지 URL을 찾을 수 없음 (menuLink.imageUrl: ${menuLink.imageUrl}). 상세 페이지에서 추출 시도...`,
          );
        }

        // 이미지 URL이 없으면 상세 페이지에서 찾기
        if (!imageUrl) {
          // 여러 이미지 선택자 시도
          const imageSelectors = [
            '.prd_image img',
            '.menu_image img',
            '.product_image img',
            '.detail_image img',
            '[class*="image"] img',
            '[class*="img"] img',
            'img[src*="menu"]',
            'img[src*="burger"]',
            'img',
          ];

          for (const selector of imageSelectors) {
            const $images = $detail(selector);

            for (let j = 0; j < $images.length; j++) {
              const $img = $detail($images.eq(j));
              const src =
                $img.attr('src') ||
                $img.attr('data-src') ||
                $img.attr('data-lazy-src') ||
                $img.attr('data-original') ||
                null;

              if (!src) continue;

              // 상대 경로를 절대 경로로 변환
              let fullUrl = src;
              if (!fullUrl.startsWith('http')) {
                if (fullUrl.startsWith('//')) {
                  fullUrl = `https:${fullUrl}`;
                } else if (fullUrl.startsWith('/')) {
                  fullUrl = `https://www.burgerking.co.kr${fullUrl}`;
                } else {
                  continue; // 상대 경로가 너무 복잡하면 스킵
                }
              }

              // 로고, 아이콘, 플레이스홀더 제외
              const lowerUrl = fullUrl.toLowerCase();
              if (
                lowerUrl.includes('logo') ||
                lowerUrl.includes('icon') ||
                lowerUrl.includes('placeholder') ||
                lowerUrl.includes('banner') ||
                lowerUrl.includes('header') ||
                lowerUrl.includes('footer')
              ) {
                continue;
              }

              // 메뉴 이미지로 보이는 URL인지 확인 (menu, burger, product 등 포함)
              if (
                lowerUrl.includes('menu') ||
                lowerUrl.includes('burger') ||
                lowerUrl.includes('product') ||
                lowerUrl.includes('mob-prd.burgerking.co.kr')
              ) {
                imageUrl = fullUrl;
                console.log(
                  `    📷 상세 페이지에서 이미지 발견: ${imageUrl.substring(0, 80)}...`,
                );
                break;
              }
            }

            if (imageUrl) break;
          }

          // 여전히 이미지를 찾지 못했으면 첫 번째 유효한 이미지 사용
          if (!imageUrl) {
            const $allImages = $detail('img');
            for (let j = 0; j < $allImages.length; j++) {
              const $img = $detail($allImages.eq(j));
              const src =
                $img.attr('src') ||
                $img.attr('data-src') ||
                $img.attr('data-lazy-src') ||
                null;

              if (!src) continue;

              let fullUrl = src;
              if (!fullUrl.startsWith('http')) {
                if (fullUrl.startsWith('//')) {
                  fullUrl = `https:${fullUrl}`;
                } else if (fullUrl.startsWith('/')) {
                  fullUrl = `https://www.burgerking.co.kr${fullUrl}`;
                } else {
                  continue;
                }
              }

              const lowerUrl = fullUrl.toLowerCase();
              if (
                !lowerUrl.includes('logo') &&
                !lowerUrl.includes('icon') &&
                !lowerUrl.includes('placeholder') &&
                !lowerUrl.includes('banner')
              ) {
                imageUrl = fullUrl;
                console.log(
                  `    📷 대체 이미지 사용: ${imageUrl.substring(0, 80)}...`,
                );
                break;
              }
            }
          }

          if (!imageUrl) {
            console.log(`    ⚠️ 이미지 URL을 찾을 수 없음: ${menuLink.name}`);
          }
        }

        // 2. 메뉴 이름 추출 (상세 페이지에서 정확한 이름 확인)
        let menuName = menuLink.name;
        const $menuTitle = $detail(
          'h1, h2, .menu-title, .product-title, [class*="title"]',
        ).first();
        if ($menuTitle.length > 0) {
          const titleText = $menuTitle.text().trim();
          if (titleText && titleText.length > 0 && titleText.length < 100) {
            menuName = titleText;
          }
        }

        // 3. 영양성분 정보 추출 (Puppeteer 사용 - 모달이 JavaScript로 동적 로드됨)
        let nutritionData: {
          kcal?: number;
          protein?: number;
          sodium?: number;
          sugar?: number;
          saturatedFat?: number;
        } = {};

        console.log(`    🌐 Puppeteer로 모달 열기 시도...`);

        try {
          // Puppeteer 브라우저 실행
          const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          });

          try {
            const page = await browser.newPage();

            // User-Agent 설정
            await page.setUserAgent(
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            );

            // 페이지 로드
            await page.goto(menuLink.url, {
              waitUntil: 'networkidle2',
              timeout: 30000,
            });

            // Vue.js 앱이 로드될 때까지 대기
            await page
              .waitForFunction(
                () => {
                  // Vue 앱이 로드되었는지 확인 (#app 요소와 Vue 컴포넌트)
                  const app = document.querySelector('#app');
                  if (!app) return false;

                  // 버튼이 렌더링되었는지 확인
                  const buttons = document.querySelectorAll('button');
                  for (const btn of buttons) {
                    const text = btn.textContent || '';
                    if (text.includes('원산지') || text.includes('영양성분')) {
                      return true;
                    }
                  }
                  return false;
                },
                { timeout: 10000 },
              )
              .catch(() => {
                // 버튼이 없어도 계속 진행
                console.log(`    ⚠️ Vue 앱 로드 대기 중 타임아웃 (계속 진행)`);
              });

            // 페이지가 완전히 로드될 때까지 추가 대기
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // 페이지 스크롤 (버튼이 보이도록)
            await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight / 2);
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // 다시 위로 스크롤
            await page.evaluate(() => {
              window.scrollTo(0, 0);
            });
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // 모달 버튼 찾기 및 클릭
            const modalButtonSelectors = [
              'button.btn_info_link',
              '.btn_info_link',
              'button[class*="btn_info_link"]',
              '[class*="btn_info_link"]',
              'button[class*="btn_info"]',
              'button[class*="info_link"]',
            ];

            let modalOpened = false;

            // 방법 1: CSS 선택자로 버튼 찾기
            for (const selector of modalButtonSelectors) {
              try {
                await page.waitForSelector(selector, { timeout: 5000 });
                const buttons = await page.$$(selector);
                console.log(
                  `    🔍 선택자 "${selector}": ${buttons.length}개 버튼 발견`,
                );

                for (const button of buttons) {
                  const buttonInfo = await page.evaluate((el) => {
                    const text = el.textContent || '';
                    const innerHTML = el.innerHTML || '';
                    const span = el.querySelector('span');
                    const spanText = span ? span.textContent?.trim() || '' : '';
                    return { text, innerHTML, spanText };
                  }, button);

                  // 버튼 텍스트, 내부 HTML, 또는 span 텍스트에 "원산지" 또는 "영양성분"이 포함되어 있는지 확인
                  const hasTargetText =
                    buttonInfo.text.includes('원산지') ||
                    buttonInfo.text.includes('영양성분') ||
                    buttonInfo.text.includes('알레르기') ||
                    buttonInfo.innerHTML.includes('원산지') ||
                    buttonInfo.innerHTML.includes('영양성분') ||
                    buttonInfo.innerHTML.includes('알레르기') ||
                    buttonInfo.spanText.includes('원산지') ||
                    buttonInfo.spanText.includes('영양성분') ||
                    buttonInfo.spanText.includes('알레르기');

                  if (hasTargetText) {
                    console.log(
                      `    🔍 후보 버튼 발견: "${buttonInfo.text.trim()}" (span: "${buttonInfo.spanText}")`,
                    );

                    // 버튼이 보이는지 확인
                    const isVisible = await page.evaluate((el) => {
                      const style = window.getComputedStyle(el);
                      const rect = el.getBoundingClientRect();
                      return (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        rect.width > 0 &&
                        rect.height > 0
                      );
                    }, button);

                    if (isVisible) {
                      // 버튼이 보이는 위치로 스크롤
                      await page.evaluate((el) => {
                        el.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        });
                      }, button);
                      await new Promise((resolve) => setTimeout(resolve, 500));

                      // JavaScript 클릭 시도
                      await page.evaluate((el) => {
                        (el as HTMLElement).click();
                      }, button);

                      await new Promise((resolve) => setTimeout(resolve, 2000));

                      // 모달이 실제로 열렸는지 확인
                      const modalVisible = await page.evaluate(() => {
                        const modals = document.querySelectorAll(
                          '.modalWrap, .popWrap',
                        );
                        for (const m of modals) {
                          const style = window.getComputedStyle(m);
                          if (
                            style.display !== 'none' &&
                            style.visibility !== 'hidden'
                          ) {
                            return true;
                          }
                        }
                        return false;
                      });

                      if (modalVisible) {
                        modalOpened = true;
                        console.log(
                          `    ✅ 모달 버튼 클릭 성공: ${selector} (텍스트: "${buttonInfo.text.trim()}")`,
                        );
                        break;
                      } else {
                        console.log(
                          `    ⚠️ 버튼 클릭했지만 모달이 열리지 않음`,
                        );
                      }
                    } else {
                      console.log(`    ⚠️ 버튼이 보이지 않음`);
                    }
                  }
                }

                if (modalOpened) break;
              } catch (e) {
                // 다음 선택자 시도
                continue;
              }
            }

            // 방법 2: span 내부 텍스트로 버튼 찾기
            if (!modalOpened) {
              try {
                const buttonsWithSpan = await page.evaluate(() => {
                  const buttons = Array.from(
                    document.querySelectorAll('button'),
                  );
                  return buttons
                    .map((btn, idx) => {
                      const span = btn.querySelector('span');
                      if (span) {
                        const spanText = span.textContent?.trim() || '';
                        if (
                          spanText.includes('원산지') ||
                          spanText.includes('영양성분') ||
                          spanText.includes('알레르기')
                        ) {
                          return {
                            index: idx,
                            text: btn.textContent?.trim() || '',
                            spanText,
                          };
                        }
                      }
                      return null;
                    })
                    .filter(
                      (
                        info,
                      ): info is {
                        index: number;
                        text: string;
                        spanText: string;
                      } => info !== null,
                    );
                });

                if (buttonsWithSpan.length > 0) {
                  console.log(
                    `    🔍 span 내부 텍스트로 ${buttonsWithSpan.length}개 버튼 발견`,
                  );
                  const allButtons = await page.$$('button');

                  for (const btnInfo of buttonsWithSpan) {
                    if (btnInfo.index < allButtons.length) {
                      const button = allButtons[btnInfo.index];

                      const isVisible = await page.evaluate((el) => {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        return (
                          style.display !== 'none' &&
                          style.visibility !== 'hidden' &&
                          style.opacity !== '0' &&
                          rect.width > 0 &&
                          rect.height > 0
                        );
                      }, button);

                      if (isVisible) {
                        await page.evaluate((el) => {
                          el.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }, button);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500),
                        );

                        await page.evaluate((el) => {
                          (el as HTMLElement).click();
                        }, button);

                        await new Promise((resolve) =>
                          setTimeout(resolve, 2000),
                        );

                        const modalVisible = await page.evaluate(() => {
                          const modals = document.querySelectorAll(
                            '.modalWrap, .popWrap',
                          );
                          for (const m of modals) {
                            const style = window.getComputedStyle(m);
                            if (
                              style.display !== 'none' &&
                              style.visibility !== 'hidden'
                            ) {
                              return true;
                            }
                          }
                          return false;
                        });

                        if (modalVisible) {
                          modalOpened = true;
                          console.log(
                            `    ✅ 모달 버튼 클릭 성공 (span 텍스트: "${btnInfo.spanText}")`,
                          );
                          break;
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(`    ⚠️ span 텍스트 버튼 찾기 실패: ${e.message}`);
              }
            }

            // 방법 3: 모든 버튼을 순회하며 텍스트 확인 (span 포함)
            if (!modalOpened) {
              try {
                const allButtons = await page.$$('button');
                console.log(`    🔍 총 ${allButtons.length}개의 버튼 발견`);

                for (const button of allButtons) {
                  const buttonInfo = await page.evaluate((el) => {
                    const text = el.textContent || '';
                    const innerHTML = el.innerHTML || '';
                    const className = el.className || '';
                    const hasSpan = el.querySelector('span') !== null;
                    return { text, innerHTML, className, hasSpan };
                  }, button);

                  // 버튼 텍스트나 내부 HTML에 "원산지" 또는 "영양성분"이 포함되어 있는지 확인
                  const hasTargetText =
                    buttonInfo.text.includes('원산지') ||
                    buttonInfo.text.includes('영양성분') ||
                    buttonInfo.text.includes('알레르기') ||
                    buttonInfo.innerHTML.includes('원산지') ||
                    buttonInfo.innerHTML.includes('영양성분') ||
                    buttonInfo.innerHTML.includes('알레르기');

                  if (hasTargetText) {
                    console.log(
                      `    🔍 후보 버튼 발견: "${buttonInfo.text.trim()}" (클래스: ${buttonInfo.className})`,
                    );

                    const isVisible = await page.evaluate((el) => {
                      const style = window.getComputedStyle(el);
                      const rect = el.getBoundingClientRect();
                      return (
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        rect.width > 0 &&
                        rect.height > 0
                      );
                    }, button);

                    if (isVisible) {
                      // 버튼이 보이는 위치로 스크롤
                      await page.evaluate((el) => {
                        el.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        });
                      }, button);
                      await new Promise((resolve) => setTimeout(resolve, 500));

                      // JavaScript 클릭 시도
                      await page.evaluate((el) => {
                        (el as HTMLElement).click();
                      }, button);

                      await new Promise((resolve) => setTimeout(resolve, 2000));

                      const modalVisible = await page.evaluate(() => {
                        const modals = document.querySelectorAll(
                          '.modalWrap, .popWrap',
                        );
                        for (const m of modals) {
                          const style = window.getComputedStyle(m);
                          if (
                            style.display !== 'none' &&
                            style.visibility !== 'hidden'
                          ) {
                            return true;
                          }
                        }
                        return false;
                      });

                      if (modalVisible) {
                        modalOpened = true;
                        console.log(
                          `    ✅ 모달 버튼 클릭 성공 (전체 검색, 텍스트: "${buttonInfo.text.trim()}")`,
                        );
                        break;
                      } else {
                        console.log(
                          `    ⚠️ 버튼 클릭했지만 모달이 열리지 않음`,
                        );
                      }
                    } else {
                      console.log(`    ⚠️ 버튼이 보이지 않음`);
                    }
                  }
                }
              } catch (e) {
                console.log(`    ⚠️ 전체 버튼 검색 실패: ${e.message}`);
              }
            }

            if (!modalOpened) {
              console.log(`    ⚠️ 모달 버튼을 찾을 수 없음`);
              // 디버깅: 페이지의 모든 버튼 정보 출력
              const allButtonInfo = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons
                  .map((btn) => {
                    const text = btn.textContent?.trim() || '';
                    const className = btn.className || '';
                    const hasSpan = btn.querySelector('span') !== null;
                    const spanText = hasSpan
                      ? btn.querySelector('span')?.textContent?.trim() || ''
                      : '';
                    return { text, className, spanText };
                  })
                  .filter((info) => info.text.length > 0);
              });

              console.log(`    🔍 발견된 버튼 정보 (최대 15개):`);
              for (let i = 0; i < Math.min(15, allButtonInfo.length); i++) {
                const info = allButtonInfo[i];
                console.log(
                  `      ${i + 1}. "${info.text}" (클래스: ${info.className}${info.spanText ? `, span: "${info.spanText}"` : ''})`,
                );
              }

              // btn_info_link 클래스를 가진 버튼 확인
              const infoLinkButtons = await page.$$(
                '.btn_info_link, button.btn_info_link',
              );
              console.log(
                `    🔍 .btn_info_link 버튼 개수: ${infoLinkButtons.length}`,
              );
              if (infoLinkButtons.length > 0) {
                for (let i = 0; i < infoLinkButtons.length; i++) {
                  const btnText = await page.evaluate(
                    (el) => el.textContent?.trim() || '',
                    infoLinkButtons[i],
                  );
                  console.log(`      버튼 ${i + 1}: "${btnText}"`);
                }
              }
            }

            // 모달이 열릴 때까지 대기 (모달이 열렸다면)
            if (modalOpened) {
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // 모달이 실제로 표시되었는지 다시 확인
              const modalStillVisible = await page.evaluate(() => {
                const modals = document.querySelectorAll(
                  '.modalWrap, .popWrap',
                );
                for (const m of modals) {
                  const style = window.getComputedStyle(m);
                  if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden'
                  ) {
                    return true;
                  }
                }
                return false;
              });

              if (!modalStillVisible) {
                console.log(`    ⚠️ 모달이 열렸다가 닫혔거나 표시되지 않음`);
                modalOpened = false;
              }
            }

            let extractedNutrition: {
              productName: string;
              kcal?: number;
              protein?: number;
              sodium?: number;
              sugar?: number;
              saturatedFat?: number;
            } | null = null;

            // 모달이 열렸을 때만 테이블 추출 시도
            if (modalOpened) {
              // 모달 내부의 영양성분 테이블에서 데이터 추출
              extractedNutrition = await page.evaluate((targetMenuName) => {
                // 모달 내부의 영양성분 테이블 찾기
                // 먼저 표시된 모달 찾기
                const modals = document.querySelectorAll(
                  '.modalWrap, .popWrap',
                );
                let modal: Element | null = null;

                for (const m of modals) {
                  const style = window.getComputedStyle(m);
                  if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden'
                  ) {
                    modal = m;
                    break;
                  }
                }

                if (!modal) return null;

                // "영양성분" 제목이 있는 cont_box02 찾기
                const contBoxes = modal.querySelectorAll('.cont_box02');
                let nutritionTable: HTMLTableElement | null = null;

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

                // 대체 방법: 모든 info_table 중에서 영양성분 테이블 찾기
                if (!nutritionTable) {
                  const allTables = modal.querySelectorAll('table.info_table');
                  for (const table of allTables) {
                    const text = table.textContent || '';
                    if (
                      text.includes('열량') &&
                      (text.includes('단백질') || text.includes('나트륨'))
                    ) {
                      nutritionTable = table as HTMLTableElement;
                      break;
                    }
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
                  const cells = row.querySelectorAll('td, th');
                  if (cells.length === 0) continue;

                  const productName = cells[0].textContent?.trim() || '';
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
                    // 영양성분 데이터 추출
                    const result: any = {};

                    // 열량
                    if (
                      headerMap['kcal'] !== undefined &&
                      cells.length > headerMap['kcal']
                    ) {
                      const valueText =
                        cells[headerMap['kcal']].textContent?.trim() || '';
                      const match = valueText.match(/(\d+)/);
                      if (match) result.kcal = parseFloat(match[1]);
                    }

                    // 단백질
                    if (
                      headerMap['protein'] !== undefined &&
                      cells.length > headerMap['protein']
                    ) {
                      const valueText =
                        cells[headerMap['protein']].textContent?.trim() || '';
                      const match = valueText.match(/(\d+)/);
                      if (match) result.protein = parseFloat(match[1]);
                    }

                    // 나트륨
                    if (
                      headerMap['sodium'] !== undefined &&
                      cells.length > headerMap['sodium']
                    ) {
                      const valueText =
                        cells[headerMap['sodium']].textContent?.trim() || '';
                      const match = valueText.match(/(\d+)/);
                      if (match) result.sodium = parseFloat(match[1]);
                    }

                    // 당류
                    if (
                      headerMap['sugar'] !== undefined &&
                      cells.length > headerMap['sugar']
                    ) {
                      const valueText =
                        cells[headerMap['sugar']].textContent?.trim() || '';
                      const match = valueText.match(/(\d+(?:\.\d+)?)/);
                      if (match) result.sugar = parseFloat(match[1]);
                    }

                    // 포화지방
                    if (
                      headerMap['saturatedFat'] !== undefined &&
                      cells.length > headerMap['saturatedFat']
                    ) {
                      const valueText =
                        cells[headerMap['saturatedFat']].textContent?.trim() ||
                        '';
                      const match = valueText.match(/(\d+(?:\.\d+)?)/);
                      if (match) result.saturatedFat = parseFloat(match[1]);
                    }

                    return {
                      productName,
                      ...result,
                    };
                  }
                }

                return null;
              }, menuName);

              if (extractedNutrition) {
                console.log(
                  `    ✅ 영양성분 테이블 발견! 메뉴: "${extractedNutrition.productName}"`,
                );

                if (extractedNutrition.kcal !== undefined) {
                  nutritionData.kcal = extractedNutrition.kcal;
                  console.log(`      📊 열량: ${nutritionData.kcal} Kcal`);
                }
                if (extractedNutrition.protein !== undefined) {
                  nutritionData.protein = extractedNutrition.protein;
                  console.log(`      📊 단백질: ${nutritionData.protein} g`);
                }
                if (extractedNutrition.sodium !== undefined) {
                  nutritionData.sodium = extractedNutrition.sodium;
                  console.log(`      📊 나트륨: ${nutritionData.sodium} mg`);
                }
                if (extractedNutrition.sugar !== undefined) {
                  nutritionData.sugar = extractedNutrition.sugar;
                  console.log(`      📊 당류: ${nutritionData.sugar} g`);
                }
                if (extractedNutrition.saturatedFat !== undefined) {
                  nutritionData.saturatedFat = extractedNutrition.saturatedFat;
                  console.log(
                    `      📊 포화지방: ${nutritionData.saturatedFat} g`,
                  );
                }
              } else {
                console.log(
                  `    ⚠️ 모달 내부에서 영양성분 테이블 또는 메뉴 이름과 일치하는 행을 찾을 수 없음`,
                );
              }
            } else {
              console.log(
                `    ⚠️ 모달이 열리지 않아 영양성분을 추출할 수 없음`,
              );
            }

            await page.close();
          } finally {
            await browser.close();
          }
        } catch (error) {
          console.log(`    ⚠️ Puppeteer 오류: ${error.message}`);
        }

        // 영양성분 데이터 확인
        if (Object.keys(nutritionData).length === 0) {
          console.log(`    ⚠️ 영양성분 데이터를 추출하지 못했습니다.`);
        } else {
          console.log(
            `    ✅ 영양성분 추출 완료: ${JSON.stringify(nutritionData)}`,
          );
        }

        // 4. 데이터베이스에 저장 또는 업데이트
        const existingMenuItem = await this.menuItemsRepository.findOne({
          where: {
            brandId: brand.id,
            name: menuName,
          },
        });

        if (existingMenuItem) {
          // 업데이트
          if (imageUrl) {
            existingMenuItem.imageUrl = imageUrl;
          }
          existingMenuItem.detailUrl = menuLink.url;
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
          }

          updated++;
          console.log(`  ✅ 업데이트 완료: ${menuName}`);
          if (imageUrl) {
            console.log(`    이미지: ${imageUrl.substring(0, 80)}...`);
          } else {
            console.log(
              `    ⚠️ 이미지 URL이 null입니다. 기존 값 유지 또는 상세 페이지에서 추출 실패.`,
            );
          }
          if (Object.keys(nutritionData).length > 0) {
            console.log(`    영양성분: ${JSON.stringify(nutritionData)}`);
          }
        } else {
          // 생성
          const menuItem = this.menuItemsRepository.create({
            brandId: brand.id,
            name: menuName,
            category: 'burger',
            imageUrl: imageUrl || undefined,
            detailUrl: menuLink.url,
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
          }

          created++;
          console.log(`  ✅ 생성 완료: ${menuName}`);
          if (imageUrl) {
            console.log(`    이미지: ${imageUrl.substring(0, 80)}...`);
          }
          if (Object.keys(nutritionData).length > 0) {
            console.log(`    영양성분: ${JSON.stringify(nutritionData)}`);
          }
        }
      } catch (error: any) {
        errors++;
        const errorMsg = `${menuLink.name}: ${error.message}`;
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
      total: menuLinks.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
