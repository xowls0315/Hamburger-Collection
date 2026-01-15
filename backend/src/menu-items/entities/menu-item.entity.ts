import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { Nutrition } from '../../nutrition/entities/nutrition.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Brand, (brand) => brand.menuItems)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'brand_id' })
  brandId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 50 })
  category: string; // 'burger', 'chicken', 'side', 'drink'

  @Column({ name: 'image_url', nullable: true, length: 500 })
  imageUrl: string;

  @Column({ name: 'detail_url', nullable: true, length: 500 })
  detailUrl: string; // 원본 사이트 링크

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToOne(() => Nutrition, (nutrition) => nutrition.menuItem, {
    cascade: true,
  })
  nutrition: Nutrition;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
