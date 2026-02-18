import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 카카오 로그인 사용자만 설정. 일반 회원가입 사용자는 null */
  @Column({ type: 'varchar', name: 'kakao_id', unique: true, nullable: true, length: 100 })
  kakaoId: string | null;

  /** 일반 로그인용 아이디 (회원가입 시 설정, unique) */
  @Column({ type: 'varchar', name: 'login_id', unique: true, nullable: true, length: 50 })
  loginId: string | null;

  /** bcrypt 해시된 비밀번호 (일반 회원만) */
  @Column({ type: 'varchar', name: 'password', nullable: true, length: 255 })
  password: string | null;

  /** ID/PW 찾기용 이메일 (일반 회원가입 시 입력) */
  @Column({ type: 'varchar', nullable: true, length: 255 })
  email: string | null;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({ type: 'varchar', name: 'profile_image', nullable: true, length: 500 })
  profileImage: string | null;

  @Column({ type: 'varchar', default: 'user', length: 20 })
  role: string; // 'user' | 'admin'

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
