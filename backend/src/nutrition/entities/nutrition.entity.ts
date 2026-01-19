import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';

@Entity('nutrition')
export class Nutrition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => MenuItem, (menuItem) => menuItem.nutrition)
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ name: 'menu_item_id', unique: true })
  menuItemId: string;

  @Column({ type: 'int', nullable: true })
  kcal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  protein: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  saturatedFat: number; // 포화지방 (g)

  @Column({ type: 'int', nullable: true })
  sodium: number; // mg

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sugar: number;
}
