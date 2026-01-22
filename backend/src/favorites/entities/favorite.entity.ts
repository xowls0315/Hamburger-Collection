import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MenuItem } from '../../menu-items/entities/menu-item.entity';

@Entity('favorites')
@Unique(['userId', 'menuItemId']) // 사용자당 메뉴 아이템은 하나만 즐겨찾기 가능
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.favorites)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => MenuItem)
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
