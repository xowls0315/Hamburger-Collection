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

    // 롯데리아 버거 메뉴 목록 (사용자가 제공한 29개)
    const lotteriaMenus = [
      '통다리 크리스피치킨버거(파이어핫)',
      '통다리 크리스피치킨버거(그릭랜치)',
      '모짜렐라버거 발사믹바질',
      '모짜렐라버거 토마토바질',
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
      'NEW 미라클버거',
      'NEW 더블 미라클버거',
      '미라클버거',
      '더블 미라클버거',
      '모짜렐라 인 더 버거 베이컨',
      '핫크리스피치킨버거',
      '리아 사각새우 더블',
      '클래식치즈버거',
      '리아 불고기',
      '리아 새우',
      '티렉스버거',
      '치킨버거(N)',
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
            const matched = targetMenus.some((target) => {
              const normalizedTarget = target.replace(/\s+/g, '').toLowerCase();
              return (
                normalizedMenuName === normalizedTarget ||
                normalizedMenuName.includes(normalizedTarget) ||
                normalizedTarget.includes(normalizedMenuName)
              );
            });

            if (matched) {
              results.push({
                name: menuName,
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

            const detailUrl = `https://www.lotteeatz.com/products/introductions/${menuItem.productId}?rccode=brnd_main`;

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
              detailUrl,
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
              detailUrl: `https://www.lotteeatz.com/products/introductions/${menuItem.productId}?rccode=brnd_main`,
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
            'https://www.lotteeatz.com/upload/etc/ria/items.html',
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
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

      // "버거메뉴" 섹션 찾기
      const burgerTbody = $nutrition('tbody').filter((_, elem) => {
        const firstTd = $nutrition(elem).find('td').first();
        const text = firstTd.text().trim();
        return text === '버거메뉴';
      });

      if (burgerTbody.length > 0) {
        console.log(`  ✅ "버거메뉴" 섹션 발견`);

        // 메뉴 이름 정규화 함수 (공백만 제거, 괄호는 유지)
        const normalizeMenuName = (name: string): string => {
          return name
            .replace(/\s+/g, '') // 모든 공백 제거 (괄호 앞뒤 공백 포함)
            .toLowerCase();
        };

        // 키워드 추출 함수 (메뉴 이름에서 핵심 키워드 추출, 괄호 제외)
        const extractKeywords = (name: string): string[] => {
          // 괄호를 제외한 부분에서 키워드 추출
          const withoutParentheses = name.replace(/\([^)]*\)/g, '').trim();
          // 2글자 이상의 연속된 한글/영문 조합을 키워드로 추출
          const keywords: string[] = [];
          const matches = withoutParentheses.match(/[가-힣]{2,}|[a-z]{2,}/gi);
          if (matches) {
            keywords.push(...matches.map((m) => m.toLowerCase()));
          }
          return keywords;
        };

        // 각 행 처리
        burgerTbody.find('tr').each((_, row) => {
          const cells = $nutrition(row).find('td');
          if (cells.length === 0) return;

          // 첫 번째 셀이 "버거메뉴"인 경우 (rowspan), 두 번째 셀이 메뉴 이름
          // 그렇지 않은 경우 첫 번째 셀이 메뉴 이름
          let menuNameIndex = 0;
          const firstCell = cells.eq(0);
          const firstCellText = firstCell.text().trim();

          if (firstCellText === '버거메뉴' || firstCell.attr('rowspan')) {
            menuNameIndex = 1; // rowspan이면 두 번째 셀이 메뉴 이름
          }

          if (cells.length <= menuNameIndex) return;

          const menuName = cells.eq(menuNameIndex).text().trim();
          if (!menuName || menuName === '버거메뉴') return;

          // 타겟 메뉴 목록과 매칭 (정규화된 이름으로 비교)
          const normalizedMenuName = normalizeMenuName(menuName);
          const menuHasParentheses = /\([^)]+\)/.test(normalizedMenuName);
          const menuKeywords = extractKeywords(menuName);
          let matchedMenu: string | undefined;
          let bestMatchScore = 0;

          for (const target of lotteriaMenus) {
            const normalizedTarget = normalizeMenuName(target);
            const targetHasParentheses = /\([^)]+\)/.test(normalizedTarget);
            const targetKeywords = extractKeywords(target);

            // 1. 정확히 일치 (최고 점수) - 항상 매칭
            if (normalizedMenuName === normalizedTarget) {
              matchedMenu = target;
              bestMatchScore = 100;
              break;
            }

            // 2. 괄호가 있는 경우는 정확히 일치해야만 매칭 (부분 매칭 불가)
            if (menuHasParentheses || targetHasParentheses) {
              // 괄호가 있는 경우는 정확히 일치하는 경우만 매칭
              // 이미 위에서 체크했으므로 여기서는 스킵
              continue;
            }

            // 3. 괄호가 없는 경우에만 부분 매칭 허용
            // 한쪽이 다른 쪽을 완전히 포함하는 경우
            if (normalizedMenuName.includes(normalizedTarget)) {
              const score =
                (normalizedTarget.length / normalizedMenuName.length) * 90;
              if (score > bestMatchScore && normalizedTarget.length >= 3) {
                matchedMenu = target;
                bestMatchScore = score;
              }
            } else if (normalizedTarget.includes(normalizedMenuName)) {
              const score =
                (normalizedMenuName.length / normalizedTarget.length) * 90;
              if (score > bestMatchScore && normalizedMenuName.length >= 3) {
                matchedMenu = target;
                bestMatchScore = score;
              }
            }

            // 4. 키워드 기반 매칭 (공통 키워드가 많을수록 높은 점수)
            if (menuKeywords.length > 0 && targetKeywords.length > 0) {
              const commonKeywords = menuKeywords.filter((kw) =>
                targetKeywords.includes(kw),
              );
              if (commonKeywords.length > 0) {
                const keywordScore =
                  (commonKeywords.length /
                    Math.max(menuKeywords.length, targetKeywords.length)) *
                  80;
                if (keywordScore > bestMatchScore) {
                  matchedMenu = target;
                  bestMatchScore = keywordScore;
                }
              }
            }

            // 5. 부분 문자열 매칭 (긴 공통 부분이 있으면)
            let commonLength = 0;
            const minLen = Math.min(
              normalizedMenuName.length,
              normalizedTarget.length,
            );
            for (let i = 0; i < minLen; i++) {
              if (normalizedMenuName[i] === normalizedTarget[i]) {
                commonLength++;
              } else {
                break;
              }
            }
            if (commonLength >= 5) {
              const similarityScore = (commonLength / minLen) * 70;
              if (similarityScore > bestMatchScore) {
                matchedMenu = target;
                bestMatchScore = similarityScore;
              }
            }
          }

          // 매칭 점수가 충분히 높을 때만 매칭 성공으로 간주 (60점 이상)
          // 단, 괄호가 있는 경우는 정확히 일치(100점)만 허용
          if (menuHasParentheses && bestMatchScore < 100) {
            matchedMenu = undefined;
          } else if (!menuHasParentheses && bestMatchScore < 60) {
            matchedMenu = undefined;
          }

          if (matchedMenu) {
            const nutrition: any = {};

            // 셀 인덱스 계산 (rowspan 고려)
            // 헤더: 구분(0) | 제품명(1) | 알레르기(2) | 중량(3) | 열량(4) | 단백질(5) | 나트륨(6) | 당류(7) | 포화지방(8) | 카페인(9) | 원산지(10)
            // 첫 번째 행 (rowspan 있음): 버거메뉴(0) | 제품명(1) | 알레르기(2) | 중량(3) | 열량(4) | 단백질(5) | 나트륨(6) | 당류(7) | 포화지방(8)
            // 나머지 행 (rowspan 없음): 제품명(0) | 알레르기(1) | 중량(2) | 열량(3) | 단백질(4) | 나트륨(5) | 당류(6) | 포화지방(7)

            // rowspan이 있으면 (menuNameIndex === 1) 실제 데이터는 인덱스 1부터 시작
            // rowspan이 없으면 (menuNameIndex === 0) 실제 데이터는 인덱스 0부터 시작
            // 하지만 메뉴 이름 다음이 알레르기, 그 다음이 중량, 그 다음이 열량...
            // 따라서: 메뉴이름 다음 = 알레르기, 그 다음 = 중량, 그 다음 = 열량

            // 열량: 메뉴이름 인덱스 + 3 (알레르기, 중량 건너뛰고)
            const kcalIndex = menuNameIndex + 3;
            if (cells.length > kcalIndex) {
              const valueText = cells.eq(kcalIndex).text().trim();
              const match = valueText.match(/(\d+)/);
              if (match) {
                nutrition.kcal = parseFloat(match[1]);
              }
            }

            // 단백질: 메뉴이름 인덱스 + 4
            const proteinIndex = menuNameIndex + 4;
            if (cells.length > proteinIndex) {
              const valueText = cells.eq(proteinIndex).text().trim();
              // "12(23%)" 형식에서 숫자 추출
              const match = valueText.match(/(\d+(?:\.\d+)?)/);
              if (match) {
                nutrition.protein = parseFloat(match[1]);
              }
            }

            // 나트륨: 메뉴이름 인덱스 + 5
            const sodiumIndex = menuNameIndex + 5;
            if (cells.length > sodiumIndex) {
              const valueText = cells.eq(sodiumIndex).text().trim();
              // "590(30%)" 형식에서 숫자 추출
              const match = valueText.match(/(\d+)/);
              if (match) {
                nutrition.sodium = parseFloat(match[1]);
              }
            }

            // 당류: 메뉴이름 인덱스 + 6
            const sugarIndex = menuNameIndex + 6;
            if (cells.length > sugarIndex) {
              const valueText = cells.eq(sugarIndex).text().trim();
              const match = valueText.match(/(\d+(?:\.\d+)?)/);
              if (match) {
                nutrition.sugar = parseFloat(match[1]);
              }
            }

            // 포화지방: 메뉴이름 인덱스 + 7
            const saturatedFatIndex = menuNameIndex + 7;
            if (cells.length > saturatedFatIndex) {
              const valueText = cells.eq(saturatedFatIndex).text().trim();
              const match = valueText.match(/(\d+(?:\.\d+)?)/);
              if (match) {
                nutrition.saturatedFat = parseFloat(match[1]);
              }
            }

            if (Object.keys(nutrition).length > 0) {
              nutritionMap.set(matchedMenu, nutrition);
              console.log(
                `    ✅ 영양성분 추출: "${menuName}" -> "${matchedMenu}" -> ${JSON.stringify(nutrition)}`,
              );
            } else {
              console.log(
                `    ⚠️ 영양성분 데이터 없음: "${menuName}" (매칭: "${matchedMenu}")`,
              );
            }
          } else {
            // 매칭 실패한 메뉴도 로그로 출력 (디버깅용)
            if (normalizedMenuName.length > 2) {
              // 가장 유사한 메뉴 찾기 (디버깅용)
              let closestMatch: { name: string; score: number } | null = null;
              for (const target of lotteriaMenus) {
                const normalizedTarget = normalizeMenuName(target);
                const targetKeywords = extractKeywords(target);
                const menuKeywords = extractKeywords(menuName);

                let score = 0;
                if (normalizedMenuName === normalizedTarget) {
                  score = 100;
                } else if (normalizedMenuName.includes(normalizedTarget)) {
                  score =
                    (normalizedTarget.length / normalizedMenuName.length) * 90;
                } else if (normalizedTarget.includes(normalizedMenuName)) {
                  score =
                    (normalizedMenuName.length / normalizedTarget.length) * 90;
                }

                if (menuKeywords.length > 0 && targetKeywords.length > 0) {
                  const commonKeywords = menuKeywords.filter((kw) =>
                    targetKeywords.includes(kw),
                  );
                  if (commonKeywords.length > 0) {
                    const keywordScore =
                      (commonKeywords.length /
                        Math.max(menuKeywords.length, targetKeywords.length)) *
                      80;
                    score = Math.max(score, keywordScore);
                  }
                }

                if (!closestMatch || score > closestMatch.score) {
                  closestMatch = { name: target, score };
                }
              }

              if (closestMatch && closestMatch.score > 0) {
                console.log(
                  `    ⚠️ 매칭 실패: "${menuName}" (정규화: ${normalizedMenuName}) | 가장 유사한 메뉴: "${closestMatch.name}" (점수: ${closestMatch.score.toFixed(1)})`,
                );
              } else {
                console.log(
                  `    ⚠️ 매칭 실패: "${menuName}" (정규화: ${normalizedMenuName})`,
                );
              }
            }
          }
        });

        console.log(`  📊 총 ${nutritionMap.size}개의 메뉴 영양성분 추출 완료`);
      } else {
        console.log(`  ⚠️ "버거메뉴" 섹션을 찾을 수 없음`);
      }
    } catch (error: any) {
      console.error(`  ❌ 영양성분 페이지 오류: ${error.message}`);
      errors++;
      errorDetails.push(`영양성분 페이지 오류: ${error.message}`);
    }

    // 데이터베이스에 저장
    console.log(`\n💾 데이터베이스에 저장 중...`);

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
      total: lotteriaMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
