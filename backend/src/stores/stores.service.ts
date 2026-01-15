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
  }
}
