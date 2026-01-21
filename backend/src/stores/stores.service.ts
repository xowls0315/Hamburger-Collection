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

      return response.data.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.place_name,
        address: doc.address_name,
        roadAddress: doc.road_address_name,
        phone: doc.phone,
        placeUrl: doc.place_url,
        distance: parseInt(doc.distance),
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
      }));
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
