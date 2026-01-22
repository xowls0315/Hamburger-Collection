import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { MenuItem } from '../menu-items/entities/menu-item.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    @InjectRepository(MenuItem)
    private menuItemsRepository: Repository<MenuItem>,
  ) {}

  async findAllByUserId(userId: string): Promise<Favorite[]> {
    return await this.favoritesRepository.find({
      where: { userId },
      relations: ['menuItem', 'menuItem.brand', 'menuItem.nutrition'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, menuItemId: string): Promise<Favorite> {
    // 메뉴 아이템이 존재하는지 확인
    const menuItem = await this.menuItemsRepository.findOne({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      throw new NotFoundException(
        `Menu item with id ${menuItemId} not found`,
      );
    }

    // 이미 즐겨찾기인지 확인
    const existing = await this.favoritesRepository.findOne({
      where: { userId, menuItemId },
    });

    if (existing) {
      throw new ConflictException('이미 즐겨찾기에 추가된 메뉴입니다.');
    }

    const favorite = this.favoritesRepository.create({
      userId,
      menuItemId,
    });

    return await this.favoritesRepository.save(favorite);
  }

  async remove(userId: string, menuItemId: string): Promise<void> {
    const favorite = await this.favoritesRepository.findOne({
      where: { userId, menuItemId },
    });

    if (!favorite) {
      throw new NotFoundException('즐겨찾기를 찾을 수 없습니다.');
    }

    await this.favoritesRepository.remove(favorite);
  }

  async isFavorite(userId: string, menuItemId: string): Promise<boolean> {
    const favorite = await this.favoritesRepository.findOne({
      where: { userId, menuItemId },
    });

    return !!favorite;
  }
}
