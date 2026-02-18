import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user01' })
  @IsString()
  loginId: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @MinLength(1, { message: '비밀번호를 입력하세요.' })
  password: string;
}
