import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  @MinLength(1, { message: '현재 비밀번호를 입력하세요.' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword1!', description: '새 비밀번호 (8자 이상)' })
  @IsString()
  @MinLength(8, { message: '새 비밀번호는 8자 이상이어야 합니다.' })
  newPassword: string;
}
