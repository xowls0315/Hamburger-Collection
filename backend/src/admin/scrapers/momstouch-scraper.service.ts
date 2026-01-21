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
export class MomstouchScraperService extends BaseScraperService {
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
   * 맘스터치 메뉴 페이지에서 메뉴 정보(이미지, 영양성분)를 추출하여 저장
   */
  async scrapeMomstouchMenus(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug('momstouch');
    if (!brand) {
      throw new NotFoundException('맘스터치 브랜드를 찾을 수 없습니다.');
    }

    console.log(`\n🍔 맘스터치 메뉴 수집 시작...`);

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // 맘스터치 버거 메뉴 목록 (사용자가 제공한 31개)
    const momstouchMenus = [
      '불대박직화불고기버거',
      '대박직화불고기버거',
      '슈퍼싸이더블Kick',
      '에드워드 리 K싸이버거',
      '에드워드 리 K비프버거',
      '와우스모크디럭스버거',
      '에드워드 리 싸이버거',
      '에드워드 리 비프버거',
      '시그니처불고기버거',
      '불불불불싸이버거',
      '텍사스바베큐치킨버거',
      '아라비아따치즈버거',
      '비프스테이크버거',
      '그릴드더블비프버거',
      '그릴드비프버거',
      '트리플딥치즈싸이버거',
      '쉬림프싸이플렉스버거',
      '딥치즈싸이버거',
      '화이트갈릭싸이버거',
      '싸이플렉스버거',
      '새우불고기버거',
      '싸이버거',
      '불싸이버거',
      '딥치즈버거',
      '인크레더블버거',
      '언빌리버블버거',
      '불고기버거',
      '통새우버거',
      '화이트갈릭버거',
      '디럭스불고기버거',
      '휠렛버거',
    ];

    console.log(`📋 총 ${momstouchMenus.length}개의 메뉴를 처리합니다.`);

    // 메뉴 정보 맵 (이름 -> { imageUrl, detailUrl, menuId, description })
    const menuDataMap = new Map<
      string,
      {
        imageUrl?: string;
        detailUrl?: string;
        menuId?: string;
        description?: string;
      }
    >();

    // 1단계: 메뉴 목록 페이지(3페이지)에서 메뉴 정보 추출
    console.log(`\n📄 메뉴 목록 페이지에서 정보 추출 중...`);

    for (let pageNo = 1; pageNo <= 3; pageNo++) {
      try {
        await this.delay(1000); // 서버 부하 방지

        const pageUrl = `https://momstouch.co.kr/menu/new.php?pageNo=${pageNo}&field=&keyword=&v_sect=&s_gubun=&s_level=&s_gender=&s_sect1=CG0005&s_sect2=&s_order=`;
        console.log(`\n📄 페이지 ${pageNo}/3 처리 중: ${pageUrl}`);

        const response = await axios.get(pageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        const $ = cheerio.load(response.data);

        // 메뉴 리스트에서 각 메뉴 정보 추출
        $('.menu-list li').each((_, element) => {
          const $li = $(element);
          const $link = $li.find('a');
          const $h3 = $li.find('h3');
          const $figure = $li.find('figure span');

          // 메뉴 이름 추출 (한글 이름) - <h3><span>영문</span>한글</h3> 형식
          let menuName = '';
          const $h3Span = $h3.find('span');
          if ($h3Span.length > 0) {
            // span 태그가 있으면, span 다음의 텍스트가 한글 이름
            const h3Text = $h3.text();
            const spanText = $h3Span.text();
            menuName = h3Text.replace(spanText, '').trim();
          } else {
            // span이 없으면 전체 텍스트에서 영문 제거
            menuName = $h3
              .text()
              .replace(/^[A-Za-z\s]+/, '')
              .trim();
          }

          // 이미지 URL 추출 (background-image 스타일에서)
          const style = $figure.attr('style') || '';
          const imageMatch = style.match(
            /background-image:\s*url\(['"]?([^'"]+)['"]?\)/i,
          );
          let imageUrl = imageMatch ? imageMatch[1] : null;

          // 상대 경로를 절대 경로로 변환
          if (imageUrl && !imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('//')) {
              imageUrl = `https:${imageUrl}`;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = `https://momstouch.co.kr${imageUrl}`;
            } else {
              // 상대 경로인 경우
              imageUrl = `https://momstouch.co.kr/${imageUrl}`;
            }
          }

          // 상세 페이지 ID 추출 (go_view 함수에서)
          // href 속성에서 먼저 찾기
          const href = $link.attr('href') || '';
          let menuIdMatch = href.match(/go_view\(['"]?(\d+)['"]?\)/);

          // href에 없으면 onclick에서 찾기
          if (!menuIdMatch) {
            const onclick = $link.attr('onclick') || '';
            menuIdMatch = onclick.match(/go_view\(['"]?(\d+)['"]?\)/);
          }

          const menuId = menuIdMatch ? menuIdMatch[1] : null;

          // 디버깅: 메뉴 정보 출력
          if (!menuName || !menuId || !imageUrl) {
            console.log(
              `  ⚠️ 불완전한 메뉴 정보: 이름="${menuName}", ID=${menuId}, 이미지=${imageUrl ? '있음' : '없음'}`,
            );
          }

          // 타겟 메뉴 목록과 매칭 (이미 매칭된 메뉴는 제외)
          const alreadyMatchedMenus = Array.from(menuDataMap.keys());
          const availableTargets = momstouchMenus.filter(
            (target) => !alreadyMatchedMenus.includes(target),
          );

          let matchedMenu: string | undefined;
          let bestMatchScore = 0;

          // 메뉴 이름 정규화 함수 (공백 제거, 소문자 변환)
          const normalizeMenuName = (name: string): string => {
            return name.replace(/\s+/g, '').toLowerCase();
          };

          // 키워드 추출 함수 (2글자 이상의 한글 키워드)
          const extractKeywords = (name: string): string[] => {
            const keywords = name.match(/[가-힣]{2,}/g) || [];
            return keywords.map((k) => k.toLowerCase());
          };

          const normalizedMenuName = normalizeMenuName(menuName);
          const menuKeywords = extractKeywords(menuName);

          for (const target of availableTargets) {
            const normalizedTarget = normalizeMenuName(target);
            const targetKeywords = extractKeywords(target);

            let score = 0;

            // 1. 정확히 일치 (최고 점수) - 즉시 매칭
            if (normalizedMenuName === normalizedTarget) {
              matchedMenu = target;
              bestMatchScore = 100;
              break;
            }

            // 2. 부분 포함 매칭 (더 엄격한 조건)
            // 한쪽이 다른 쪽을 완전히 포함하는 경우만 허용
            if (normalizedMenuName.includes(normalizedTarget)) {
              // 메뉴 이름이 타겟을 포함하는 경우
              // 타겟이 최소 5글자 이상이어야 함 (너무 짧은 부분 매칭 방지)
              if (normalizedTarget.length >= 5) {
                score =
                  (normalizedTarget.length / normalizedMenuName.length) * 90;
              }
            } else if (normalizedTarget.includes(normalizedMenuName)) {
              // 타겟이 메뉴 이름을 포함하는 경우
              // 메뉴 이름이 최소 5글자 이상이어야 함
              if (normalizedMenuName.length >= 5) {
                score =
                  (normalizedMenuName.length / normalizedTarget.length) * 90;
              }
            }

            // 3. 키워드 매칭 (더 엄격한 조건)
            if (menuKeywords.length > 0 && targetKeywords.length > 0) {
              // 공통 키워드 찾기
              const commonKeywords = menuKeywords.filter((mk) =>
                targetKeywords.some((tk) => mk === tk),
              );

              if (commonKeywords.length > 0) {
                // 모든 키워드가 일치하는 경우에만 높은 점수
                if (
                  commonKeywords.length === menuKeywords.length &&
                  commonKeywords.length === targetKeywords.length
                ) {
                  score = 95; // 거의 정확한 매칭
                } else {
                  // 일부 키워드만 일치하는 경우
                  const keywordScore =
                    (commonKeywords.length /
                      Math.max(menuKeywords.length, targetKeywords.length)) *
                    75;
                  if (keywordScore > score) {
                    score = keywordScore;
                  }
                }
              }
            }

            // 최고 점수 업데이트 (70점 이상만 허용)
            if (score > bestMatchScore && score >= 70) {
              matchedMenu = target;
              bestMatchScore = score;
            }
          }

          if (matchedMenu && menuId && bestMatchScore >= 70) {
            const detailUrl = `https://momstouch.co.kr/menu/view.php?idx=${menuId}&pageNo=${pageNo}&field=&keyword=&v_sect=&s_gubun=&s_level=&s_gender=&s_sect1=CG0005&s_sect2=&s_order=`;

            menuDataMap.set(matchedMenu, {
              imageUrl: imageUrl || undefined,
              detailUrl,
              menuId,
            });

            console.log(
              `  ✅ 발견: "${matchedMenu}" (ID: ${menuId}, 원본 이름: "${menuName}", 점수: ${bestMatchScore.toFixed(1)})${imageUrl ? ` - 이미지: ${imageUrl.substring(0, 60)}...` : ''}`,
            );
          } else if (menuName && menuId) {
            console.log(
              `  ⚠️ 매칭 실패: "${menuName}" (ID: ${menuId}) - 타겟 메뉴 목록과 일치하지 않음 (최고 점수: ${bestMatchScore.toFixed(1)})`,
            );
          }
        });
      } catch (error: any) {
        console.error(`  ❌ 페이지 ${pageNo} 처리 실패: ${error.message}`);
        errors++;
        errorDetails.push(`페이지 ${pageNo} 처리 실패: ${error.message}`);
      }
    }

    console.log(`\n📊 총 ${menuDataMap.size}개의 메뉴 정보를 찾았습니다.`);

    // 2단계: 각 메뉴 상세 페이지에서 이미지 URL 확인 및 영양성분 이미지 URL 추출
    console.log(`\n🖼️ 상세 페이지에서 이미지 URL 확인 중...`);

    const nutritionImageMap = new Map<string, string>(); // menuId -> 영양성분 이미지 URL

    for (const [menuName, menuData] of menuDataMap.entries()) {
      if (!menuData.menuId || !menuData.detailUrl) continue;

      try {
        await this.delay(1000); // 서버 부하 방지

        console.log(
          `\n[${Array.from(menuDataMap.keys()).indexOf(menuName) + 1}/${menuDataMap.size}] 처리 중: ${menuName}`,
        );

        const detailResponse = await axios.get(menuData.detailUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        const $detail = cheerio.load(detailResponse.data);

        // 상세 페이지에서 이미지 URL 확인
        const $detailImage = $detail('figure img');
        if ($detailImage.length > 0) {
          let detailImageUrl = $detailImage.attr('src') || '';
          if (detailImageUrl && !detailImageUrl.startsWith('http')) {
            if (detailImageUrl.startsWith('//')) {
              detailImageUrl = `https:${detailImageUrl}`;
            } else if (detailImageUrl.startsWith('/')) {
              detailImageUrl = `https://momstouch.co.kr${detailImageUrl}`;
            }
          }

          if (detailImageUrl) {
            menuData.imageUrl = detailImageUrl;
            console.log(
              `    📷 상세 페이지 이미지: ${detailImageUrl.substring(0, 80)}...`,
            );
          }
        }

        // 영양성분 모달에서 이미지 URL 추출
        const $nutritionModal = $detail('#modal-nutrition');
        const $nutritionImage = $nutritionModal.find('img');
        if ($nutritionImage.length > 0) {
          let nutritionImageUrl = $nutritionImage.attr('src') || '';
          if (nutritionImageUrl && !nutritionImageUrl.startsWith('http')) {
            if (nutritionImageUrl.startsWith('//')) {
              nutritionImageUrl = `https:${nutritionImageUrl}`;
            } else if (nutritionImageUrl.startsWith('/')) {
              nutritionImageUrl = `https://momstouch.co.kr${nutritionImageUrl}`;
            }
          }

          if (nutritionImageUrl) {
            nutritionImageMap.set(menuData.menuId, nutritionImageUrl);
            console.log(
              `    📊 영양성분 이미지: ${nutritionImageUrl.substring(0, 80)}...`,
            );
          }
        }

        // description 추출 (p.description 요소에서)
        const $description = $detail('p.description');
        if ($description.length > 0) {
          let descriptionText = $description.text().trim();
          if (descriptionText) {
            // 여러 공백을 하나로 정리
            descriptionText = descriptionText.replace(/\s+/g, ' ').trim();
            menuData.description = descriptionText;
            console.log(
              `    📝 description 발견: ${descriptionText.substring(0, 60)}...`,
            );
          } else {
            console.log(`    ⚠️ description을 찾을 수 없음`);
          }
        } else {
          console.log(`    ⚠️ description 요소를 찾을 수 없음`);
        }
      } catch (error: any) {
        console.error(`    ⚠️ 상세 페이지 처리 실패: ${error.message}`);
        errors++;
        errorDetails.push(`${menuName}: 상세 페이지 처리 실패`);
      }
    }

    // 3단계: 영양성분 데이터 매핑 (이미지 설명에서 직접 추출한 데이터 사용)
    console.log(`\n📊 영양성분 데이터 매핑 중...`);
    const nutritionMap = new Map<string, any>();

    // 사용자가 제공한 이미지 설명 기반 영양성분 데이터 매핑
    // 형식: { kcal, protein, sodium, sugar, saturatedFat }
    const nutritionDataMapping: Record<string, any> = {
      슈퍼싸이더블Kick: {
        kcal: 883,
        protein: 48,
        sodium: 1679,
        sugar: 13,
        saturatedFat: 10.2,
      },
      '에드워드 리 K싸이버거': {
        kcal: 695,
        protein: 35,
        sodium: 1533,
        sugar: 10,
        saturatedFat: 10.6,
      },
      '에드워드 리 K비프버거': {
        kcal: 601,
        protein: 29,
        sodium: 1139,
        sugar: 11,
        saturatedFat: 13.7,
      },
      와우스모크디럭스버거: {
        kcal: 579,
        protein: 34,
        sodium: 849,
        sugar: 14,
        saturatedFat: 5.5,
      },
      '에드워드 리 싸이버거': {
        kcal: 615,
        protein: 37,
        sodium: 1152,
        sugar: 14,
        saturatedFat: 7.8,
      },
      '에드워드 리 비프버거': {
        kcal: 638,
        protein: 31,
        sodium: 922,
        sugar: 14,
        saturatedFat: 13.6,
      },
      시그니처불고기버거: {
        kcal: 569,
        protein: 19,
        sodium: 1157,
        sugar: 18,
        saturatedFat: 13.3,
      },
      불불불불싸이버거: {
        kcal: 639,
        protein: 32,
        sodium: 1379,
        sugar: 17,
        saturatedFat: 9.5,
      },
      텍사스바베큐치킨버거: {
        kcal: 679,
        protein: 36,
        sodium: 1498,
        sugar: 9,
        saturatedFat: 10.7,
      },
      아라비아따치즈버거: {
        kcal: 791,
        protein: 41,
        sodium: 1622,
        sugar: 10,
        saturatedFat: 12,
      },
      비프스테이크버거: {
        kcal: 739,
        protein: 36,
        sodium: 1149,
        sugar: 14,
        saturatedFat: 13.9,
      },
      그릴드더블비프버거: {
        kcal: 826,
        protein: 50,
        sodium: 1259,
        sugar: 9,
        saturatedFat: 24,
      },
      그릴드비프버거: {
        kcal: 565,
        protein: 28,
        sodium: 895,
        sugar: 8,
        saturatedFat: 14.4,
      },
      트리플딥치즈싸이버거: {
        kcal: 659,
        protein: 31,
        sodium: 1514,
        sugar: 10,
        saturatedFat: 14,
      },
      쉬림프싸이플렉스버거: {
        kcal: 858,
        protein: 29,
        sodium: 1392,
        sugar: 12,
        saturatedFat: 11.8,
      },
      딥치즈싸이버거: {
        kcal: 655,
        protein: 30,
        sodium: 1196,
        sugar: 10,
        saturatedFat: 12.1,
      },
      화이트갈릭싸이버거: {
        kcal: 759,
        protein: 37,
        sodium: 1345,
        sugar: 10,
        saturatedFat: 13,
      },
      싸이플렉스버거: {
        kcal: 991,
        protein: 44,
        sodium: 2024,
        sugar: 14,
        saturatedFat: 15.2,
      },
      새우불고기버거: {
        kcal: 601,
        protein: 19,
        sodium: 1054,
        sugar: 20,
        saturatedFat: 6.3,
      },
      싸이버거: {
        kcal: 594,
        protein: 28,
        sodium: 1009,
        sugar: 14,
        saturatedFat: 8.6,
      },
      불싸이버거: {
        kcal: 543,
        protein: 28,
        sodium: 1152,
        sugar: 15,
        saturatedFat: 6.9,
      },
      딥치즈버거: {
        kcal: 543,
        protein: 33,
        sodium: 1087,
        sugar: 9,
        saturatedFat: 7.1,
      },
      인크레더블버거: {
        kcal: 749,
        protein: 38,
        sodium: 1455,
        sugar: 16,
        saturatedFat: 8.6,
      },
      언빌리버블버거: {
        kcal: 702,
        protein: 40,
        sodium: 1423,
        sugar: 13,
        saturatedFat: 6.3,
      },
      불고기버거: {
        kcal: 403,
        protein: 14,
        sodium: 615,
        sugar: 14,
        saturatedFat: 5.1,
      },
      통새우버거: {
        kcal: 449,
        protein: 12,
        sodium: 707,
        sugar: 9,
        saturatedFat: 12.4,
      },
      화이트갈릭버거: {
        kcal: 638,
        protein: 40,
        sodium: 1268,
        sugar: 13,
        saturatedFat: 9.0,
      },
      디럭스불고기버거: {
        kcal: 614,
        protein: 24,
        sodium: 1197,
        sugar: 16,
        saturatedFat: 9.3,
      },
      휠렛버거: {
        kcal: 545,
        protein: 32,
        sodium: 939,
        sugar: 13,
        saturatedFat: 4.2,
      },
      불대박직화불고기버거: {
        kcal: 448,
        protein: 21,
        sodium: 794,
        sugar: 16,
        saturatedFat: 7.7,
      },
      대박직화불고기버거: {
        kcal: 470,
        protein: 28,
        sodium: 900,
        sugar: 15,
        saturatedFat: 8.5,
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

    // 4단계: 데이터베이스에 저장
    console.log(`\n💾 데이터베이스에 저장 중...`);

    for (const targetMenu of momstouchMenus) {
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
      total: momstouchMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }
}
