import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: '댓글 내용',
    example: '좋은 글이네요!',
    minLength: 1,
  })
  @IsString({ message: 'content must be a string' })
  @IsNotEmpty({ message: '이 입력란을 입력하세요.' })
  @MinLength(1, { message: '이 입력란을 입력하세요.' })
  content: string;
}
