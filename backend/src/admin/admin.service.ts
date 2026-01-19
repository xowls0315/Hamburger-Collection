import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestLog } from './entities/ingest-log.entity';
import { BrandsService } from '../brands/brands.service';
import { MenuItem } from '../menu-items/entities/menu-item.entity';
import { Nutrition } from '../nutrition/entities/nutrition.entity';
import {
  CreateMenuItemDto,
  BulkCreateMenuItemDto,
} from './dto/create-menu-item.dto';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

@Injectable()
export class AdminService {
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

  /**
   * 단일 메뉴 아이템 추가
   */
  async createMenuItem(
    brandSlug: string,
    createMenuItemDto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    const brand = await this.brandsService.findOneBySlug(brandSlug);
    if (!brand) {
      throw new NotFoundException(`브랜드 '${brandSlug}'를 찾을 수 없습니다.`);
    }

    // 기존 메뉴 확인 (같은 브랜드, 같은 이름)
    const existingMenuItem = await this.menuItemsRepository.findOne({
      where: {
        brandId: brand.id,
        name: createMenuItemDto.name,
      },
    });

    if (existingMenuItem) {
      // 기존 메뉴 업데이트
      existingMenuItem.category = createMenuItemDto.category;
      if (createMenuItemDto.imageUrl !== undefined) {
        existingMenuItem.imageUrl = createMenuItemDto.imageUrl;
      }
      if (createMenuItemDto.detailUrl !== undefined) {
        existingMenuItem.detailUrl = createMenuItemDto.detailUrl;
      }
      if (createMenuItemDto.isActive !== undefined) {
        existingMenuItem.isActive = createMenuItemDto.isActive;
      }

      // 영양정보 업데이트
      if (createMenuItemDto.nutrition) {
        let nutrition = await this.nutritionRepository.findOne({
          where: { menuItemId: existingMenuItem.id },
        });

        if (!nutrition) {
          nutrition = this.nutritionRepository.create({
            menuItemId: existingMenuItem.id,
          });
        }

        Object.assign(nutrition, createMenuItemDto.nutrition);
        await this.nutritionRepository.save(nutrition);
      }

      return await this.menuItemsRepository.save(existingMenuItem);
    } else {
      // 새 메뉴 생성
      const menuItem = this.menuItemsRepository.create({
        brandId: brand.id,
        name: createMenuItemDto.name,
        category: createMenuItemDto.category,
        imageUrl: createMenuItemDto.imageUrl,
        detailUrl: createMenuItemDto.detailUrl,
        isActive: createMenuItemDto.isActive ?? true,
      });

      const savedMenuItem = await this.menuItemsRepository.save(menuItem);

      // 영양정보 추가
      if (createMenuItemDto.nutrition) {
        const nutrition = this.nutritionRepository.create({
          menuItemId: savedMenuItem.id,
          ...createMenuItemDto.nutrition,
        });
        await this.nutritionRepository.save(nutrition);
      }

      return savedMenuItem;
    }
  }

  /**
   * 일괄 메뉴 아이템 추가
   */
  async bulkCreateMenuItems(bulkCreateDto: BulkCreateMenuItemDto): Promise<{
    success: boolean;
    brand: string;
    total: number;
    created: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug(
      bulkCreateDto.brandSlug,
    );
    if (!brand) {
      throw new NotFoundException(
        `브랜드 '${bulkCreateDto.brandSlug}'를 찾을 수 없습니다.`,
      );
    }

    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const menuItemDto of bulkCreateDto.menuItems) {
      try {
        const existingMenuItem = await this.menuItemsRepository.findOne({
          where: {
            brandId: brand.id,
            name: menuItemDto.name,
          },
        });

        if (existingMenuItem) {
          // 업데이트
          existingMenuItem.category = menuItemDto.category;
          if (menuItemDto.imageUrl !== undefined) {
            existingMenuItem.imageUrl = menuItemDto.imageUrl;
          }
          if (menuItemDto.detailUrl !== undefined) {
            existingMenuItem.detailUrl = menuItemDto.detailUrl;
          }
          if (menuItemDto.isActive !== undefined) {
            existingMenuItem.isActive = menuItemDto.isActive;
          }
          await this.menuItemsRepository.save(existingMenuItem);

          // 영양정보 업데이트
          if (menuItemDto.nutrition) {
            let nutrition = await this.nutritionRepository.findOne({
              where: { menuItemId: existingMenuItem.id },
            });

            if (!nutrition) {
              nutrition = this.nutritionRepository.create({
                menuItemId: existingMenuItem.id,
              });
            }

            Object.assign(nutrition, menuItemDto.nutrition);
            await this.nutritionRepository.save(nutrition);
          }

          updated++;
        } else {
          // 생성
          const menuItem = this.menuItemsRepository.create({
            brandId: brand.id,
            name: menuItemDto.name,
            category: menuItemDto.category,
            imageUrl: menuItemDto.imageUrl,
            detailUrl: menuItemDto.detailUrl,
            isActive: menuItemDto.isActive ?? true,
          });

          const savedMenuItem = await this.menuItemsRepository.save(menuItem);

          // 영양정보 추가
          if (menuItemDto.nutrition) {
            const nutrition = this.nutritionRepository.create({
              menuItemId: savedMenuItem.id,
              ...menuItemDto.nutrition,
            });
            await this.nutritionRepository.save(nutrition);
          }

          created++;
        }
      } catch (error: any) {
        errors++;
        errorDetails.push(
          `${menuItemDto.name}: ${error.message || '알 수 없는 오류'}`,
        );
      }
    }

    // 수집 로그 저장
    await this.createIngestLog({
      brandId: brand.id,
      status: errors === 0 ? 'success' : 'partial',
      changedCount: created + updated,
      error: errors > 0 ? JSON.stringify(errorDetails.slice(0, 10)) : undefined,
    });

    return {
      success: true,
      brand: brand.name,
      total: bulkCreateDto.menuItems.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }

  /**
   * 맥도날드 메뉴 페이지에서 이미지 URL을 추출하여 업데이트
   */
  async updateImageUrlsFromMcDonalds(): Promise<{
    success: boolean;
    brand: string;
    total: number;
    updated: number;
    errors: number;
    errorDetails: string[];
  }> {
    const brand = await this.brandsService.findOneBySlug('mcdonalds');
    if (!brand) {
      throw new NotFoundException('맥도날드 브랜드를 찾을 수 없습니다.');
    }

    // 해당 브랜드의 모든 버거 메뉴 가져오기
    const menuItems = await this.menuItemsRepository.find({
      where: {
        brandId: brand.id,
        category: 'burger',
        isActive: true,
      },
    });

    console.log(
      `\n🖼️ 맥도날드 버거 메뉴 ${menuItems.length}개에 대한 이미지 URL 업데이트 시작...`,
    );

    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // 메뉴 이름 정규화 함수 (세트, 특수문자 제거)
    const normalizeMenuName = (name: string): string => {
      return name
        .replace(/\s*세트\s*/g, '') // "세트" 제거
        .replace(/\s+/g, ' ') // 여러 공백을 하나로
        .replace(/®/g, '') // 특수문자 제거
        .replace(/™/g, '')
        .trim()
        .toLowerCase();
    };

    // 페이지별로 스크래핑 (1~4페이지)
    const totalPages = 4;
    const menuDataMap = new Map<string, string>(); // 정규화된 이름 -> 이미지 URL

    for (let page = 1; page <= totalPages; page++) {
      try {
        await this.delay(500); // 서버 부하 방지

        const pageUrl = `https://www.mcdonalds.co.kr/kor/menu/burger?ca=16&page=${page}`;
        console.log(`\n📄 페이지 ${page}/${totalPages} 처리 중: ${pageUrl}`);

        const response = await axios.get(pageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        const $ = cheerio.load(response.data);

        // 모든 img 태그를 찾아서 메뉴와 매칭
        $('img').each((i, imgElem) => {
          const $img = $(imgElem);
          let imageUrl =
            $img.attr('src') ||
            $img.attr('data-src') ||
            $img.attr('data-lazy-src') ||
            null;

          // 유효한 이미지 URL인지 확인 (로고, 아이콘 등 제외)
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

          // 상대 경로를 절대 경로로 변환
          if (!imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('//')) {
              imageUrl = `https:${imageUrl}`;
            } else if (imageUrl.startsWith('/')) {
              imageUrl = `https://www.mcdonalds.co.kr${imageUrl}`;
            } else {
              return; // 상대 경로가 이상하면 스킵
            }
          }

          // 이미지 주변에서 메뉴 이름 찾기
          // 부모 요소들을 거슬러 올라가며 메뉴 이름 찾기
          let $parent = $img.parent();
          let menuName: string | null = null;
          let maxDepth = 10; // 최대 10단계까지 탐색

          while ($parent.length > 0 && maxDepth > 0) {
            const text = $parent.text().trim();

            // 버거 이름 패턴 찾기
            const burgerNamePatterns = [
              /([가-힣\s®™]+버거[가-힣\s®™\s]*)/,
              /([가-힣\s®™]+버거[가-힣\s®™\s]*세트)/,
              /(빅맥|1955|쿼터파운더|베이컨|맥치킨|맥크리스피|불고기|슈비|슈슈|치즈버거|햄버거|트리플|더블)/,
            ];

            for (const pattern of burgerNamePatterns) {
              const match = text.match(pattern);
              if (match && match[1]) {
                const candidate = match[1].trim();
                // 너무 짧거나 긴 텍스트는 제외
                if (candidate.length >= 2 && candidate.length <= 50) {
                  menuName = candidate;
                  break;
                }
              }
            }

            if (menuName) break;

            $parent = $parent.parent();
            maxDepth--;
          }

          // 메뉴 이름을 찾지 못한 경우, 이미지의 alt 속성 확인
          if (!menuName) {
            const alt = $img.attr('alt');
            if (alt && alt.includes('버거')) {
              menuName = alt.trim();
            }
          }

          if (imageUrl && menuName) {
            const normalizedName = normalizeMenuName(menuName);
            // 중복 체크: 같은 정규화된 이름이 있으면 더 긴 원본 이름 사용
            if (
              !menuDataMap.has(normalizedName) ||
              menuName.length >
                menuDataMap.get(normalizedName)!.split(' -> ')[0].length
            ) {
              menuDataMap.set(normalizedName, imageUrl);
              console.log(
                `  ✅ 발견: "${menuName}" -> ${normalizedName} -> ${imageUrl.substring(0, 80)}...`,
              );
            }
          }
        });

        // 추가 방법: 텍스트 기반으로 메뉴 찾기
        // 모든 텍스트 노드에서 버거 이름 찾고, 그 근처의 이미지 찾기
        const burgerKeywords = [
          '빅맥',
          '1955',
          '쿼터파운더',
          '베이컨',
          '맥치킨',
          '맥크리스피',
          '불고기',
          '슈비',
          '슈슈',
          '치즈버거',
          '햄버거',
          '트리플',
          '더블',
          '행운버거',
          '맥스파이시',
          '상하이',
          '토마토',
        ];

        $('*').each((i, elem) => {
          const $elem = $(elem);
          const text = $elem.text().trim();

          // 버거 이름이 포함된 텍스트 찾기
          const hasBurgerName =
            burgerKeywords.some((keyword) => text.includes(keyword)) &&
            (text.includes('버거') || text.includes('세트'));

          if (hasBurgerName && text.length < 100) {
            // 이 요소나 부모 요소에서 이미지 찾기
            let $searchElem = $elem;
            let imageUrl: string | null = null;

            // 현재 요소와 부모 요소들에서 이미지 찾기
            for (let depth = 0; depth < 5; depth++) {
              const $img = $searchElem.find('img').first();
              if ($img.length > 0) {
                imageUrl =
                  $img.attr('src') ||
                  $img.attr('data-src') ||
                  $img.attr('data-lazy-src') ||
                  null;
                if (
                  imageUrl &&
                  !imageUrl.includes('logo') &&
                  !imageUrl.includes('icon')
                ) {
                  break;
                }
              }
              $searchElem = $searchElem.parent();
              if ($searchElem.length === 0) break;
            }

            if (imageUrl) {
              // 상대 경로를 절대 경로로 변환
              if (!imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('//')) {
                  imageUrl = `https:${imageUrl}`;
                } else if (imageUrl.startsWith('/')) {
                  imageUrl = `https://www.mcdonalds.co.kr${imageUrl}`;
                }
              }

              // 텍스트에서 메뉴 이름 추출
              const menuNameMatch =
                text.match(/([가-힣\s®™]+버거[가-힣\s®™\s]*)/) ||
                text.match(/([가-힣\s®™]+버거[가-힣\s®™\s]*세트)/);

              if (menuNameMatch && menuNameMatch[1]) {
                const menuName = menuNameMatch[1].trim();
                const normalizedName = normalizeMenuName(menuName);
                if (!menuDataMap.has(normalizedName)) {
                  menuDataMap.set(normalizedName, imageUrl);
                  console.log(
                    `  ✅ 발견 (텍스트 기반): "${menuName}" -> ${normalizedName} -> ${imageUrl.substring(0, 80)}...`,
                  );
                }
              }
            }
          }
        });
      } catch (error: any) {
        errors++;
        const errorMsg = `페이지 ${page} 처리 실패: ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    console.log(
      `\n📊 총 ${menuDataMap.size}개의 메뉴 이미지 URL을 찾았습니다.`,
    );

    // 디버깅: 찾은 모든 메뉴 이름 출력
    console.log('\n📋 찾은 메뉴 목록:');
    for (const [normalizedName, imageUrl] of menuDataMap.entries()) {
      console.log(`  - ${normalizedName}`);
    }
    console.log('\n📋 데이터베이스 메뉴 목록:');
    for (const menuItem of menuItems) {
      console.log(
        `  - ${normalizeMenuName(menuItem.name)} (원본: ${menuItem.name})`,
      );
    }

    // 데이터베이스 메뉴와 매칭하여 업데이트
    for (const menuItem of menuItems) {
      try {
        const normalizedMenuItemName = normalizeMenuName(menuItem.name);
        let matchedImageUrl: string | null = null;
        let matchedName: string | null = null;

        // 정확히 일치하는 경우
        if (menuDataMap.has(normalizedMenuItemName)) {
          matchedImageUrl = menuDataMap.get(normalizedMenuItemName)!;
          matchedName = normalizedMenuItemName;
        } else {
          // 부분 일치 검색 - 더 유연한 매칭
          let bestMatch: { name: string; url: string; score: number } | null =
            null;

          for (const [
            normalizedScrapedName,
            imageUrl,
          ] of menuDataMap.entries()) {
            let score = 0;

            // 메뉴 이름의 주요 단어들이 모두 포함되는지 확인
            const menuWords = normalizedMenuItemName
              .split(/\s+/)
              .filter((word) => word.length > 1);

            const matchingWords = menuWords.filter((word) =>
              normalizedScrapedName.includes(word),
            ).length;

            // 단어 매칭 점수
            score = matchingWords / menuWords.length;

            // 한쪽이 다른 쪽을 포함하는 경우
            if (
              normalizedScrapedName.includes(normalizedMenuItemName) ||
              normalizedMenuItemName.includes(normalizedScrapedName)
            ) {
              score = Math.max(score, 0.8);
            }

            // 특정 키워드 매칭 (빅맥, 1955 등)
            const keywords = [
              '빅맥',
              '1955',
              '쿼터파운더',
              '베이컨',
              '맥치킨',
              '맥크리스피',
              '불고기',
              '슈비',
              '슈슈',
              '치즈버거',
              '햄버거',
              '트리플',
              '더블',
            ];
            for (const keyword of keywords) {
              if (
                normalizedMenuItemName.includes(keyword) &&
                normalizedScrapedName.includes(keyword)
              ) {
                score = Math.max(score, 0.7);
                break;
              }
            }

            // 공백 제거 후 비교
            const noSpaceMenuItem = normalizedMenuItemName.replace(/\s+/g, '');
            const noSpaceScraped = normalizedScrapedName.replace(/\s+/g, '');
            if (
              noSpaceScraped.includes(noSpaceMenuItem) ||
              noSpaceMenuItem.includes(noSpaceScraped)
            ) {
              score = Math.max(score, 0.6);
            }

            if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { name: normalizedScrapedName, url: imageUrl, score };
            }
          }

          if (bestMatch) {
            matchedImageUrl = bestMatch.url;
            matchedName = bestMatch.name;
          }
        }

        if (matchedImageUrl) {
          menuItem.imageUrl = matchedImageUrl;
          await this.menuItemsRepository.save(menuItem);
          console.log(
            `  ✅ 업데이트 완료: ${menuItem.name} (${normalizedMenuItemName}) <-> ${matchedName} -> ${matchedImageUrl.substring(0, 80)}...`,
          );
          updated++;
        } else {
          console.log(
            `  ⚠️ 이미지 URL을 찾을 수 없음: ${menuItem.name} (정규화: ${normalizedMenuItemName})`,
          );
          errors++;
          errorDetails.push(`${menuItem.name}: 이미지 URL을 찾을 수 없음`);
        }
      } catch (error: any) {
        errors++;
        const errorMsg = `${menuItem.name}: ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`  ❌ 에러: ${errorMsg}`);
      }
    }

    console.log(`\n📊 업데이트 완료: ${updated}개 성공, ${errors}개 실패`);

    return {
      success: true,
      brand: brand.name,
      total: menuItems.length,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
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
      { productId: string; imageUrl?: string; detailUrl?: string }
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

            // 이미지 URL 추출 (background-image 스타일에서)
            const imageData = await page.evaluate(() => {
              const thumbImg = document.querySelector('div.thumb-img');
              if (!thumbImg) return null;

              const style = thumbImg.getAttribute('style') || '';
              const match = style.match(
                /background-image:\s*url\(['"]?([^'"]+)['"]?\)/,
              );
              return match ? match[1] : null;
            });

            if (imageData) {
              menuDataMap.set(menuItem.name, {
                productId: menuItem.productId,
                imageUrl: imageData,
                detailUrl,
              });
              console.log(
                `    📷 이미지 URL 발견: ${imageData.substring(0, 80)}...`,
              );
            } else {
              menuDataMap.set(menuItem.name, {
                productId: menuItem.productId,
                detailUrl,
              });
              console.log(`    ⚠️ 이미지 URL을 찾을 수 없음`);
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
      const nutritionResponse = await axios.get(
        'https://www.lotteeatz.com/upload/etc/ria/items.html',
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      );

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
      total: lotteriaMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
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

    // 맘스터치 버거 메뉴 목록 (사용자가 제공한 29개)
    const momstouchMenus = [
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

    // 메뉴 정보 맵 (이름 -> { imageUrl, detailUrl, menuId })
    const menuDataMap = new Map<
      string,
      { imageUrl?: string; detailUrl?: string; menuId?: string }
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
      total: momstouchMenus.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    };
  }

  /**
   * OCR로 추출한 텍스트를 파싱하여 영양성분 데이터 추출
   */
  private parseNutritionText(
    text: string,
    targetMenus: string[],
  ): Record<string, any> {
    const nutritionData: Record<string, any> = {};

    // 텍스트를 줄 단위로 분리
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    // 메뉴 이름 정규화 함수
    const normalizeMenuName = (name: string): string => {
      return name
        .replace(/\s+/g, '') // 공백 제거
        .toLowerCase()
        .replace(/[^\w가-힣]/g, ''); // 특수문자 제거
    };

    // 각 타겟 메뉴에 대해 텍스트에서 찾기
    for (const targetMenu of targetMenus) {
      const normalizedTarget = normalizeMenuName(
        targetMenu.replace(/\s+/g, ''),
      );

      // 텍스트에서 해당 메뉴 이름이 포함된 줄 찾기
      let menuLineIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const normalizedLine = normalizeMenuName(lines[i]);
        if (
          normalizedLine.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedLine)
        ) {
          menuLineIndex = i;
          break;
        }
      }

      if (menuLineIndex === -1) {
        // 메뉴 이름을 찾지 못한 경우, 부분 매칭 시도
        const targetKeywords =
          targetMenu.replace(/\s+/g, '').match(/[가-힣]{2,}/g) || [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (
            targetKeywords.some((keyword) => line.includes(keyword)) &&
            line.length < 50
          ) {
            // 메뉴 이름으로 보이는 짧은 줄
            menuLineIndex = i;
            break;
          }
        }
      }

      if (menuLineIndex === -1) continue;

      // 메뉴 이름이 있는 줄 주변에서 영양성분 데이터 추출
      const startLine = Math.max(0, menuLineIndex - 2);
      const endLine = Math.min(lines.length, menuLineIndex + 5);

      const relevantLines = lines.slice(startLine, endLine).join(' ');

      // 영양성분 데이터 추출
      const nutrition: any = {};

      // 칼로리 (kcal) - "칼로리", "kcal" 키워드와 함께
      const kcalMatch = relevantLines.match(
        /칼로리[:\s]*(\d{1,4}(?:,\d{3})*)\s*(?:kcal|Kcal|KCAL)?/i,
      );
      if (kcalMatch) {
        nutrition.kcal = parseFloat(kcalMatch[1].replace(/,/g, ''));
      } else {
        // 대체 패턴: 숫자 뒤에 kcal
        const altKcalMatch = relevantLines.match(
          /(\d{1,4}(?:,\d{3})*)\s*kcal/i,
        );
        if (altKcalMatch) {
          nutrition.kcal = parseFloat(altKcalMatch[1].replace(/,/g, ''));
        }
      }

      // 단백질 (g) - "단백질" 키워드와 함께
      const proteinMatch = relevantLines.match(
        /단백질[:\s]*(\d{1,3}(?:\.\d+)?)\s*(?:g|G)?/i,
      );
      if (proteinMatch) {
        nutrition.protein = parseFloat(proteinMatch[1]);
      }

      // 나트륨 (mg) - "나트륨" 키워드와 함께
      const sodiumMatch = relevantLines.match(
        /나트륨[:\s]*(\d{1,5}(?:,\d{3})*)\s*(?:mg|Mg|MG)?/i,
      );
      if (sodiumMatch) {
        nutrition.sodium = parseFloat(sodiumMatch[1].replace(/,/g, ''));
      }

      // 당류 (g) - "당류" 키워드와 함께
      const sugarMatch = relevantLines.match(
        /당류[:\s]*(\d{1,3}(?:\.\d+)?)\s*(?:g|G)?/i,
      );
      if (sugarMatch) {
        nutrition.sugar = parseFloat(sugarMatch[1]);
      }

      // 포화지방 (g) - "포화지방" 키워드와 함께
      const saturatedFatMatch = relevantLines.match(
        /포화지방[:\s]*(\d{1,3}(?:\.\d+)?)\s*(?:g|G)?/i,
      );
      if (saturatedFatMatch) {
        nutrition.saturatedFat = parseFloat(saturatedFatMatch[1]);
      }

      // 데이터가 하나라도 추출된 경우에만 저장
      if (Object.keys(nutrition).length > 0) {
        nutritionData[targetMenu] = nutrition;
        console.log(`      📊 ${targetMenu}: ${JSON.stringify(nutrition)}`);
      }
    }

    return nutritionData;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
