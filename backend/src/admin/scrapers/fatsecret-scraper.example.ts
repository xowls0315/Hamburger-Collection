/**
 * FatSecret 스크래퍼 예시
 * 
 * 실제 FatSecret 사이트 구조를 확인한 후,
 * 이 파일을 참고하여 admin.service.ts의 셀렉터를 수정하세요.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * FatSecret 메뉴 상세 페이지에서 데이터 추출 예시
 * 
 * 실제 사이트 구조에 맞게 셀렉터를 수정해야 합니다.
 */
async function scrapeMenuExample(url: string) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const $ = cheerio.load(response.data);

  // 예시 1: 메뉴 이름 추출
  // 실제 사이트에서 확인한 셀렉터로 변경
  const name = $('h1.foodName').text().trim();
  // 또는
  // const name = $('.food-title').text().trim();
  // const name = $('h1').first().text().trim();

  // 예시 2: 이미지 URL 추출
  const imageUrl = $('img.foodImage').attr('src');
  // 또는
  // const imageUrl = $('.food-image img').attr('src');
  // const imageUrl = $('img[alt*="메뉴이름"]').attr('src');

  // 예시 3: 영양정보 테이블에서 추출
  const nutrition: any = {};

  // 방법 1: 테이블 행에서 추출
  $('table.nutritionTable tr').each((i, elem) => {
    const label = $(elem).find('td:first-child').text().toLowerCase();
    const value = $(elem).find('td:last-child').text().replace(/[^0-9.]/g, '');

    if (label.includes('칼로리') || label.includes('calorie')) {
      nutrition.kcal = parseInt(value);
    } else if (label.includes('단백질') || label.includes('protein')) {
      nutrition.protein = parseFloat(value);
    }
    // ... 기타 영양성분
  });

  // 방법 2: 특정 클래스에서 추출
  // const kcal = $('.calories-value').text().replace(/[^0-9]/g, '');
  // const protein = $('.protein-value').text().replace(/[^0-9.]/g, '');

  // 방법 3: 데이터 속성에서 추출
  // const kcal = $('[data-calories]').attr('data-calories');

  return {
    name,
    imageUrl,
    nutrition,
  };
}

/**
 * 검색 결과 페이지에서 메뉴 링크 추출 예시
 */
async function extractMenuLinks(searchUrl: string): Promise<string[]> {
  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const $ = cheerio.load(response.data);
  const links: string[] = [];

  // 예시 1: 특정 클래스의 링크
  $('a.foodLink').each((i, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      links.push(href.startsWith('http') ? href : `https://www.fatsecret.kr${href}`);
    }
  });

  // 예시 2: href 패턴으로 찾기
  $('a[href*="/칼로리-영양소/"]').each((i, elem) => {
    const href = $(elem).attr('href');
    if (href && !links.includes(href)) {
      links.push(href.startsWith('http') ? href : `https://www.fatsecret.kr${href}`);
    }
  });

  // 예시 3: 리스트 아이템에서 추출
  // $('.food-list-item a').each((i, elem) => {
  //   const href = $(elem).attr('href');
  //   if (href) links.push(href);
  // });

  return links;
}

/**
 * 디버깅: HTML 구조 확인
 */
async function debugHtmlStructure(url: string) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const $ = cheerio.load(response.data);

  // HTML 구조 출력 (디버깅용)
  console.log('=== HTML 구조 확인 ===');
  console.log('Title:', $('title').text());
  console.log('H1:', $('h1').text());
  console.log('Food Name:', $('.foodName, .food-name, [class*="food"]').text());
  console.log('Nutrition Table:', $('table.nutrition, .nutrition-table').html());
  
  // 모든 링크 확인
  $('a[href*="칼로리"]').each((i, elem) => {
    console.log('Link:', $(elem).attr('href'), $(elem).text());
  });
}

// 사용 예시:
// debugHtmlStructure('https://www.fatsecret.kr/칼로리-영양소/맥도날드/빅맥');
