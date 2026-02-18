import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user01', description: '로그인 아이디 (4~20자 영문/숫자)' })
  @IsString()
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다.' })
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9]+$/, { message: '아이디는 영문과 숫자만 사용 가능합니다.' })
  loginId: string;

  @ApiProperty({ example: 'Password1!', description: '비밀번호 (8자 이상)' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'user@example.com', description: 'ID/PW 찾기용 이메일' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력하세요.' })
  email: string;

  @ApiProperty({ example: '닉네임', description: '표시용 닉네임' })
  @IsString()
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
  @MaxLength(20)
  nickname: string;
}
