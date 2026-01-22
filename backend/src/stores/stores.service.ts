import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BrandsService } from '../brands/brands.service';

@Injectable()
export class StoresService {
  constructor(
    private configService: ConfigService,
    private brandsService: BrandsService,
  ) {}

  async searchStores(
    brandSlug: string,
    lat: number,
    lng: number,
    radius: number = 5000,
  ) {
    const brand = await this.brandsService.findOneBySlug(brandSlug);
    if (!brand) {
      throw new Error(`Brand with slug ${brandSlug} not found`);
    }

    const keyword = brand.name;
    const apiKey = this.configService.get('KAKAO_LOCAL_API_KEY');

    if (!apiKey) {
      throw new Error('KAKAO_LOCAL_API_KEY가 설정되지 않았습니다.');
    }

    try {
      const origin =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const response = await axios.get(
        'https://dapi.kakao.com/v2/local/search/keyword.json',
        {
          params: {
            query: keyword,
            x: lng,
            y: lat,
            radius,
          },
          headers: {
            Authorization: `KakaoAK ${apiKey}`,
            KA: `sdk/1.0 os/javascript origin/${origin}`, // 카카오 로컬 API 필수 헤더
          },
        },
      );

      const stores = response.data.documents.map((doc: any) => ({
        id: doc.id,
        place_name: doc.place_name,
        address_name: doc.address_name,
        road_address_name: doc.road_address_name || '',
        phone: doc.phone || '',
        distance: doc.distance || '0',
        x: doc.x,
        y: doc.y,
        place_url: doc.place_url,
      }));

      return {
        keyword: brand.name,
        location: { lat, lng },
        radius,
        totalCount: stores.length,
        stores,
      };
    } catch (error: any) {
      if (error.response) {
        // 카카오 API 에러 응답
        const errorMessage =
          error.response.data?.message || '카카오 로컬 API 호출 실패';
        throw new Error(`카카오 로컬 API 오류: ${errorMessage}`);
      }
      throw error;
    }
  }
}
