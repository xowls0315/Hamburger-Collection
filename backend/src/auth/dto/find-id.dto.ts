import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class FindIdDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력하세요.' })
  email: string;
}
