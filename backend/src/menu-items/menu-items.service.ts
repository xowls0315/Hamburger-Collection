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
      .where('menuItem.brandId = :brandId', { brandId: brand.id })
      .andWhere('menuItem.isActive = :isActive', { isActive: true });

    if (options?.category) {
      queryBuilder.andWhere('menuItem.category = :category', {
        category: options.category,
      });
    }

    if (options?.sort === 'kcal_asc') {
      queryBuilder
        .leftJoin('menuItem.nutrition', 'nut')
        .orderBy('nut.kcal', 'ASC', 'NULLS LAST');
    } else if (options?.sort === 'kcal_desc') {
      queryBuilder
        .leftJoin('menuItem.nutrition', 'nut')
        .orderBy('nut.kcal', 'DESC', 'NULLS LAST');
    } else {
      queryBuilder.orderBy('menuItem.name', 'ASC');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
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
