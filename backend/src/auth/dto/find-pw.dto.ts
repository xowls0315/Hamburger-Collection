import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class FindPwDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력하세요.' })
  email: string;

  @ApiProperty({ example: 'user01', description: '가입 시 등록한 로그인 아이디' })
  @IsString()
  @MinLength(1, { message: '아이디를 입력하세요.' })
  loginId: string;
}
