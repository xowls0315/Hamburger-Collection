import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  slug: string; // 'mcdonalds', 'burgerking', etc.

  @Column({ length: 100 })
  name: string; // '맥도날드', '버거킹', etc.

  @Column({ name: 'logo_url', nullable: true, length: 500 })
  logoUrl: string;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.brand)
  menuItems: MenuItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
