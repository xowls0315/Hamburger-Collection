import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { BrandsService } from '../brands/brands.service';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemsRepository: Repository<MenuItem>,
    private brandsService: BrandsService,
  ) {}

  async findAllByBrandSlug(
    slug: string,
    options?: {
      category?: string;
      sort?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const brand = await this.brandsService.findOneBySlug(slug);
    if (!brand) {
      throw new NotFoundException(`Brand with slug ${slug} not found`);
    }

    const queryBuilder = this.menuItemsRepository
      .createQueryBuilder('menuItem')
      .leftJoinAndSelect('menuItem.nutrition', 'nutrition')
      .leftJoinAndSelect('menuItem.brand', 'brand')
      .where('menuItem.brandId = :brandId', { brandId: brand.id })
      .andWhere('menuItem.isActive = :isActive', { isActive: true });

    if (options?.category) {
      queryBuilder.andWhere('menuItem.category = :category', {
        category: options.category,
      });
    }

    // 정렬 처리 - 먼저 전체 데이터를 가져온 후 정렬
    const page = options?.page || 1;
    const limit = options?.limit || 12;

    // 정렬이 필요한 경우 전체 데이터를 가져와서 정렬
    if (options?.sort === 'kcal_asc' || options?.sort === 'kcal_desc') {
      const allItems = await queryBuilder.getMany();
      const total = allItems.length;

      // JavaScript에서 정렬
      allItems.sort((a, b) => {
        const aKcal = a.nutrition?.kcal ?? (options?.sort === 'kcal_asc' ? 999999 : -1);
        const bKcal = b.nutrition?.kcal ?? (options?.sort === 'kcal_asc' ? 999999 : -1);

        if (aKcal !== bKcal) {
          return options?.sort === 'kcal_asc'
            ? aKcal - bKcal
            : bKcal - aKcal;
        }

        // 칼로리가 같으면 이름순 정렬
        return a.name.localeCompare(b.name, 'ko');
      });

      // 페이지네이션 적용
      const skip = (page - 1) * limit;
      const items = allItems.slice(skip, skip + limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // 정렬이 없으면 이름순으로 정렬하고 페이지네이션
    queryBuilder.orderBy('menuItem.name', 'ASC');
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<MenuItem> {
    const menuItem = await this.menuItemsRepository.findOne({
      where: { id },
      relations: ['nutrition', 'brand'],
    });

    if (!menuItem) {
      throw new NotFoundException(`Menu item with id ${id} not found`);
    }

    return menuItem;
  }
}
