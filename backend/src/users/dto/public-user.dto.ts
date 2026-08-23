import { User } from '../entities/user.entity';

export interface PublicUserDto {
  id: string;
  nickname: string;
  profileImage: string | null;
}

export function toPublicUser(user: User): PublicUserDto {
  return {
    id: user.id,
    nickname: user.nickname,
    profileImage: user.profileImage,
  };
}
